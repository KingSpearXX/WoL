const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const config = require('../config');

// In-memory challenge store with TTL (5 minutes)
const challenges = new Map();
const CHALLENGE_TTL = 5 * 60 * 1000;

function setChallenge(key, challenge) {
  challenges.set(key, { challenge, expires: Date.now() + CHALLENGE_TTL });
}

function getChallenge(key) {
  const entry = challenges.get(key);
  if (!entry) return null;
  challenges.delete(key);
  if (Date.now() > entry.expires) return null;
  return entry.challenge;
}

// Cleanup stale challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of challenges) {
    if (now > entry.expires) challenges.delete(key);
  }
}, 60 * 1000);

async function genRegOptions(user) {
  const existingCreds = (user.credentials || []).map((c) => ({
    id: c.credentialID,
    type: 'public-key',
  }));

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: user.id,
    userDisplayName: user.id,
    attestationType: 'none',
    excludeCredentials: existingCreds,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  setChallenge(`reg_${user.id}`, options.challenge);
  return options;
}

async function verifyReg(user, response) {
  const expectedChallenge = getChallenge(`reg_${user.id}`);
  if (!expectedChallenge) throw new Error('Challenge expired or missing');

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.rpOrigin,
    expectedRPID: config.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Verification failed');
  }

  const { credential } = verification.registrationInfo;

  return {
    credentialID: credential.id,
    credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
  };
}

async function genAuthOptions(user) {
  const allowCredentials = (user.credentials || []).map((c) => ({
    id: c.credentialID,
    type: 'public-key',
  }));

  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    allowCredentials,
    userVerification: 'preferred',
  });

  setChallenge(`auth_${user.id}`, options.challenge);
  return options;
}

async function verifyAuth(user, response) {
  const expectedChallenge = getChallenge(`auth_${user.id}`);
  if (!expectedChallenge) throw new Error('Challenge expired or missing');

  const credential = (user.credentials || []).find(
    (c) => c.credentialID === response.id
  );
  if (!credential) throw new Error('Credential not found');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.rpOrigin,
    expectedRPID: config.rpId,
    credential: {
      id: credential.credentialID,
      publicKey: Buffer.from(credential.credentialPublicKey, 'base64'),
      counter: credential.counter,
    },
  });

  if (!verification.verified) throw new Error('Verification failed');

  return { newCounter: verification.authenticationInfo.newCounter };
}

module.exports = { genRegOptions, verifyReg, genAuthOptions, verifyAuth };

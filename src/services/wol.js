const dgram = require('dgram');
const net = require('net');
const { execFile } = require('child_process');

function createMagicPacket(mac) {
  const macBytes = Buffer.from(mac.replace(/[:-]/g, ''), 'hex');
  const packet = Buffer.alloc(102);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i++) {
    macBytes.copy(packet, 6 + i * 6);
  }
  return packet;
}

// Method 1: UDP broadcast via dgram
function sendDgram(packet, address, port) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    socket.once('error', (err) => { socket.close(); reject(err); });
    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, 0, packet.length, port, address, (err) => {
        socket.close();
        if (err) return reject(err);
        resolve('dgram');
      });
    });
  });
}

// Method 2: UDP broadcast on port 7 (alternate WoL port)
function sendDgramPort7(packet, address) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    socket.once('error', (err) => { socket.close(); reject(err); });
    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, 0, packet.length, 7, address, (err) => {
        socket.close();
        if (err) return reject(err);
        resolve('dgram:7');
      });
    });
  });
}

// Method 3: Send to subnet broadcast (192.168.x.255)
function sendSubnetBroadcast(packet, port) {
  return new Promise((resolve, reject) => {
    const interfaces = require('os').networkInterfaces();
    const broadcasts = [];
    for (const iface of Object.values(interfaces)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const ip = addr.address.split('.').map(Number);
          const mask = addr.netmask.split('.').map(Number);
          const bcast = ip.map((b, i) => (b | (~mask[i] & 255))).join('.');
          broadcasts.push(bcast);
        }
      }
    }
    if (broadcasts.length === 0) return reject(new Error('No broadcast addresses found'));

    const sends = broadcasts.map((bcast) =>
      new Promise((res, rej) => {
        const socket = dgram.createSocket('udp4');
        socket.once('error', (err) => { socket.close(); rej(err); });
        socket.bind(() => {
          socket.setBroadcast(true);
          socket.send(packet, 0, packet.length, port, bcast, (err) => {
            socket.close();
            if (err) return rej(err);
            res(bcast);
          });
        });
      })
    );
    Promise.allSettled(sends).then((results) => {
      const sent = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      if (sent.length > 0) resolve(`subnet:${sent.join(',')}`);
      else reject(new Error('All subnet broadcasts failed'));
    });
  });
}

// Method 4: etherwake / wakeonlan CLI tool (if installed)
function sendCli(mac) {
  return new Promise((resolve, reject) => {
    // Try etherwake first, then wakeonlan
    execFile('etherwake', [mac], { timeout: 5000 }, (err) => {
      if (!err) return resolve('etherwake');
      execFile('wakeonlan', [mac], { timeout: 5000 }, (err2) => {
        if (!err2) return resolve('wakeonlan');
        reject(new Error('No CLI tool available (etherwake/wakeonlan)'));
      });
    });
  });
}

async function wake(mac, { address = '255.255.255.255', port = 9 } = {}) {
  const packet = createMagicPacket(mac);
  const methods = [
    { name: 'dgram', fn: () => sendDgram(packet, address, port) },
    { name: 'dgram:7', fn: () => sendDgramPort7(packet, address) },
    { name: 'subnet', fn: () => sendSubnetBroadcast(packet, port) },
    { name: 'cli', fn: () => sendCli(mac) },
  ];

  const results = [];
  const errors = [];

  // Fire all methods in parallel — we want maximum chance of delivery
  const outcomes = await Promise.allSettled(methods.map((m) => m.fn()));

  outcomes.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      errors.push(`${methods[i].name}: ${outcome.reason.message}`);
    }
  });

  if (results.length > 0) {
    console.log(`Magic packet sent to ${mac} via [${results.join(', ')}]`);
  } else {
    console.error(`All WoL methods failed for ${mac}:`, errors);
    throw new Error('All wake methods failed');
  }
}

module.exports = { wake };

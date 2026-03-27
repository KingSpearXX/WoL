const dgram = require('dgram');

function createMagicPacket(mac) {
  const macBytes = Buffer.from(mac.replace(/[:-]/g, ''), 'hex');
  const packet = Buffer.alloc(102);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i++) {
    macBytes.copy(packet, 6 + i * 6);
  }
  return packet;
}

function wake(mac, { address = '255.255.255.255', port = 9 } = {}) {
  return new Promise((resolve, reject) => {
    const packet = createMagicPacket(mac);
    const socket = dgram.createSocket('udp4');

    socket.once('error', (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, 0, packet.length, port, address, (err) => {
        socket.close();
        if (err) return reject(err);
        console.log(`Magic packet sent to ${mac} via ${address}:${port}`);
        resolve();
      });
    });
  });
}

module.exports = { wake };

import { WebSocketServer, WebSocket } from 'ws';

const businessClients = new Set();

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    businessClients.add(ws);

    try {
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to Travel Live Notification Server' }));
    } catch (e) {}

    ws.on('close', () => {
      businessClients.delete(ws);
    });

    ws.on('error', () => {
      businessClients.delete(ws);
    });
  });

  return wss;
}

export function broadcastToBusiness(payload) {
  const data = JSON.stringify(payload);
  for (const client of businessClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (e) {}
    }
  }
}

export function getConnectedClientsCount() {
  return businessClients.size;
}

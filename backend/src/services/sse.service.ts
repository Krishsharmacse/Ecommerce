import type { Response } from "express";

export class SseService {
  private readonly clients = new Map<string, Set<Response>>();

  add(userId: string, response: Response): void {
    const clients = this.clients.get(userId) ?? new Set<Response>();
    clients.add(response);
    this.clients.set(userId, clients);
    response.on("close", () => this.remove(userId, response));
  }

  publish(userId: string, event: string, data: unknown): void {
    const clients = this.clients.get(userId);
    if (!clients) return;
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) client.write(message);
  }

  private remove(userId: string, response: Response): void {
    const clients = this.clients.get(userId);
    clients?.delete(response);
    if (clients?.size === 0) this.clients.delete(userId);
  }
}

export const sseService = new SseService();
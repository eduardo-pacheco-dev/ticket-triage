import { Subject } from 'rxjs';
import { TelegramNotifierService } from './telegram-notifier.service';
import { QueueEventPayload, QueueEventsService } from '../queue/queue-events.service';
import { TelegramService } from './telegram.service';

describe('TelegramNotifierService', () => {
  it('envia mensagem quando chega evento de notificação', async () => {
    const stream = new Subject<QueueEventPayload>();
    const queueEvents = { stream: stream.asObservable() } as unknown as QueueEventsService;
    const sendMessage = jest.fn(async () => {});
    const telegram = { sendMessage } as unknown as TelegramService;

    new TelegramNotifierService(queueEvents, telegram);
    stream.next({
      type: 'notification',
      action: 'created',
      title: 'Nova solicitação',
      body: 'SITE-01 • Elétrica • Fulano',
      protocol: 'DOC-ABC1234',
    });
    await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledWith(
      'Nova solicitação\nSITE-01 • Elétrica • Fulano\nProtocolo: DOC-ABC1234',
    );
  });

  it('ignora eventos que não são de notificação', async () => {
    const stream = new Subject<QueueEventPayload>();
    const queueEvents = { stream: stream.asObservable() } as unknown as QueueEventsService;
    const sendMessage = jest.fn(async () => {});
    const telegram = { sendMessage } as unknown as TelegramService;

    new TelegramNotifierService(queueEvents, telegram);
    stream.next({ type: 'queue', action: 'created', site_id: 'SITE-01' });
    await Promise.resolve();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('desinscreve do barramento ao destruir o módulo', async () => {
    const stream = new Subject<QueueEventPayload>();
    const queueEvents = { stream: stream.asObservable() } as unknown as QueueEventsService;
    const sendMessage = jest.fn(async () => {});
    const telegram = { sendMessage } as unknown as TelegramService;

    const notifier = new TelegramNotifierService(queueEvents, telegram);
    notifier.onModuleDestroy();
    stream.next({ type: 'notification', title: 'Depois do destroy', body: '' });
    await Promise.resolve();

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface QueueEventPayload {
  type: 'queue' | 'request_types' | 'notification' | 'service_orders' | 'stations';
  action?: string;
  site_id?: string;
  protocol?: string;
  status?: string;
  title?: string;
  body?: string;
}

@Injectable()
export class QueueEventsService {
  private readonly subject = new Subject<QueueEventPayload>();

  emit(payload: QueueEventPayload): void {
    this.subject.next(payload);
  }

  get stream(): Observable<QueueEventPayload> {
    return this.subject.asObservable();
  }
}

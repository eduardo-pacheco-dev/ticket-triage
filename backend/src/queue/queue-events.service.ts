import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface QueueEventPayload {
  type: 'queue' | 'request_types' | 'notification';
  action?: string;
  site_id?: string;
  protocol?: string;
  status?: string;
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

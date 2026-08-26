import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Station } from './station.entity';
import { RateLimitService } from '../common/rate-limit.service';
import { mapExcelRow } from './bulk-stations.controller';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: JobStatus;
  total: number;
  processed: number;
  inserted: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
  createdAt: Date;
  completedAt: Date | null;
}

const BATCH_SIZE = 2000;

@Injectable()
export class BulkStationsService {
  private readonly logger = new Logger(BulkStationsService.name);
  private readonly jobs = new Map<string, ImportJob>();

  constructor(
    @InjectRepository(Station)
    private readonly repository: Repository<Station>,
    private readonly rateLimit: RateLimitService,
  ) {}

  findAll() {
    return this.repository.find({ order: { siteId: 'ASC' }, take: 5000 });
  }

  async findOne(id: string): Promise<Station> {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Estação não encontrada.');
    return item;
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  getJob(jobId: string): ImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job não encontrado.');
    return job;
  }

  async startImportFromBuffer(buffer: Buffer): Promise<ImportJob> {
    if (!this.rateLimit.check('bulkStationsUpload')) {
      throw new BadRequestException('Muitas solicitações. Aguarde um minuto.');
    }

    const jobId = crypto.randomUUID();
    const job: ImportJob = {
      id: jobId,
      status: 'pending',
      total: 0,
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
      errorMessages: [],
      createdAt: new Date(),
      completedAt: null,
    };
    this.jobs.set(jobId, job);

    const tmpFile = join(tmpdir(), `bulk-stations-${randomBytes(8).toString('hex')}.xlsx`);
    await writeFile(tmpFile, buffer);

    this.processWithStreaming(jobId, tmpFile).catch((err) => {
      this.logger.error(`Job ${jobId} falhou: ${String(err)}`);
      job.status = 'failed';
      job.completedAt = new Date();
      job.errorMessages.push('Erro interno no processamento.');
      unlink(tmpFile).catch(() => {});
    });

    return job;
  }

  private async processWithStreaming(jobId: string, filePath: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    try {
      this.logger.log(`Lendo arquivo: ${filePath}`);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        job.status = 'failed';
        job.completedAt = new Date();
        job.errorMessages.push('Planilha vazia.');
        return;
      }

      this.logger.log(`Processando planilha "${sheetName}"`);

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
        raw: false,
      } as XLSX.Sheet2JSONOpts);

      this.logger.log(`${rows.length} linhas lidas do Excel`);

      if (rows.length > 0) {
        this.logger.log(`Primeiras chaves: ${Object.keys(rows[0]).slice(0, 5).join(', ')}`);
      }

      let batch: Record<string, unknown>[] = [];

      for (const row of rows) {
        const mapped = mapExcelRow(row);
        if (!mapped) continue;

        job.total++;
        batch.push(mapped);

        if (batch.length >= BATCH_SIZE) {
          await this.flushBatch(job, batch);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await this.flushBatch(job, batch);
      }

      this.logger.log(
        `Importação concluída: ${job.inserted} inseridos, ${job.skipped} ignorados, ${job.errors} erros`,
      );

      job.status = job.errors > 0 && job.errors === job.total ? 'failed' : 'completed';
      job.completedAt = new Date();
    } finally {
      unlink(filePath).catch(() => {});
    }
  }

  private async flushBatch(job: ImportJob, batch: Record<string, unknown>[]): Promise<void> {
    const entities = batch.map((input) =>
      this.repository.create({
        name: String(input.siteId ?? input.code ?? 'SEM NOME'),
        code: String(input.siteId ?? input.code ?? ''),
        siteId: input.siteId ? String(input.siteId) : null,
        elementType: input.elementType ? String(input.elementType) : null,
        technology: input.technology ? String(input.technology) : null,
        connectionType: input.connectionType ? String(input.connectionType) : null,
        addressId: input.addressId ? String(input.addressId) : null,
        classification: input.classification ? String(input.classification) : null,
        acquisitionDate: input.acquisitionDate ? new Date(String(input.acquisitionDate)) : null,
        constructionDate: input.constructionDate ? new Date(String(input.constructionDate)) : null,
        activationDate: input.activationDate ? new Date(String(input.activationDate)) : null,
        deactivationDate: input.deactivationDate ? new Date(String(input.deactivationDate)) : null,
        cancellationDate: input.cancellationDate ? new Date(String(input.cancellationDate)) : null,
        areaContractType: input.areaContractType ? String(input.areaContractType) : null,
        areaHolder: input.areaHolder ? String(input.areaHolder) : null,
        infraContractType: input.infraContractType ? String(input.infraContractType) : null,
        infraHolder: input.infraHolder ? String(input.infraHolder) : null,
        infraType: input.infraType ? String(input.infraType) : null,
        evType: input.evType ? String(input.evType) : null,
        evProvider: input.evProvider ? String(input.evProvider) : null,
        observation: input.observation ? String(input.observation) : null,
        justification: input.justification ? String(input.justification) : null,
        streetType: input.streetType ? String(input.streetType) : null,
        street: input.street ? String(input.street) : null,
        number: input.number ? String(input.number) : null,
        complement: input.complement ? String(input.complement) : null,
        neighborhood: input.neighborhood ? String(input.neighborhood) : null,
        city: input.city ? String(input.city) : null,
        state: input.state ? String(input.state) : null,
        zipCode: input.zipCode ? String(input.zipCode) : null,
        regional: input.regional ? String(input.regional) : null,
        latitude: input.latitude ? String(input.latitude) : null,
        longitude: input.longitude ? String(input.longitude) : null,
        status: input.status ? String(input.status) : null,
        towerType: input.towerType ? String(input.towerType) : null,
        aevNominal: input.aevNominal ? String(input.aevNominal) : null,
        groundArea: input.groundArea ? String(input.groundArea) : null,
        structureHeight: input.structureHeight ? String(input.structureHeight) : null,
        stationId: input.stationId ? String(input.stationId) : null,
        complexOrder: input.complexOrder ? String(input.complexOrder) : null,
        thqObservation: input.thqObservation ? String(input.thqObservation) : null,
        situation: input.situation ? String(input.situation) : null,
        ots: input.ots ? String(input.ots) : null,
      }),
    );

    try {
      const result = await this.repository
        .createQueryBuilder()
        .insert()
        .into(Station)
        .values(entities)
        .orIgnore()
        .execute();

      job.inserted += result.raw?.affectedRows ?? entities.length;
      job.skipped += entities.length - (result.raw?.affectedRows ?? entities.length);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Batch falhou: ${msg}`);
      job.errors += entities.length;
      job.errorMessages.push(`Lote: ${msg.slice(0, 200)}`);
    }

    job.processed += batch.length;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.delete(id);
  }

  async removeAll(): Promise<void> {
    await this.repository.clear();
  }
}

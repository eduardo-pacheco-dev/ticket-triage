import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as XLSX from 'xlsx';
import { BulkStationsService } from './bulk-stations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const EXCEL_COLUMN_MAP: Record<string, string> = {
  'Site ID': 'siteId',
  'Tipo de elemento': 'elementType',
  Tecnologia: 'technology',
  'Tipo de Conexão': 'connectionType',
  'Endereço ID': 'addressId',
  Classificacao: 'classification',
  'Data de aquisição': 'acquisitionDate',
  'Data de construção': 'constructionDate',
  'Data de ativação': 'activationDate',
  'Data de desativação': 'deactivationDate',
  'Data de cancelamento': 'cancellationDate',
  'Tipo de contrato da Área': 'areaContractType',
  'Detentor da Área': 'areaHolder',
  'Tipo de contrato Infra': 'infraContractType',
  'Detentor de Infra': 'infraHolder',
  'Tipo de Infra': 'infraType',
  'Tipo de EV': 'evType',
  'Fornecedor de EV': 'evProvider',
  Observação: 'observation',
  Justificativa: 'justification',
  'Tipo de logradouro': 'streetType',
  Logradouro: 'street',
  Número: 'number',
  Complemento: 'complement',
  Bairro: 'neighborhood',
  Município: 'city',
  Estado: 'state',
  CEP: 'zipCode',
  Regional: 'regional',
  Latitude: 'latitude',
  Longitude: 'longitude',
  Status: 'status',
  'Tipo da torre': 'towerType',
  'AEV Nominal': 'aevNominal',
  'Área de solo': 'groundArea',
  'Altura da estrutura': 'structureHeight',
  Station_id: 'stationId',
  'Ordem Complexa': 'complexOrder',
  'Observacao THQ': 'thqObservation',
  Situação: 'situation',
  OTs: 'ots',
};

export const EXCEL_HEADERS = Object.keys(EXCEL_COLUMN_MAP);

const DATE_FIELDS = new Set([
  'acquisitionDate',
  'constructionDate',
  'activationDate',
  'deactivationDate',
  'cancellationDate',
]);

const NULL_LITERALS = new Set(['null', 'NULL', 'Null', 'n/a', 'N/A', '-', '']);

function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  return new Date(utcMs);
}

function toIsoDateStr(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value) && value > 25569)
    return excelSerialToDate(value).toISOString();
  const str = String(value).trim();
  if (str === '') return undefined;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();
  return undefined;
}

export function mapExcelRow(row: Record<string, unknown>): Record<string, unknown> | null {
  const siteId = row['Site ID'];
  if (typeof siteId !== 'string' || siteId.trim().length === 0) return null;

  const mapped: Record<string, unknown> = {};
  for (const [excelCol, entityField] of Object.entries(EXCEL_COLUMN_MAP)) {
    const value = row[excelCol];
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str === '' || NULL_LITERALS.has(str)) continue;
    if (DATE_FIELDS.has(entityField)) {
      const iso = toIsoDateStr(value);
      if (iso) mapped[entityField] = iso;
    } else {
      mapped[entityField] = str;
    }
  }
  return mapped;
}

@Controller('bulk-stations')
@UseGuards(JwtAuthGuard)
export class BulkStationsController {
  constructor(private readonly service: BulkStationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('count')
  async count() {
    return { count: await this.service.count() };
  }

  @Get('export')
  async exportExcel(@Res() res: Response) {
    const items = await this.service.findAll();

    const data = items.map((item) => [
      item.siteId ?? item.code,
      item.elementType ?? '',
      item.technology ?? '',
      item.connectionType ?? '',
      item.addressId ?? '',
      item.classification ?? '',
      item.acquisitionDate ? new Date(item.acquisitionDate).toLocaleDateString('pt-BR') : '',
      item.constructionDate ? new Date(item.constructionDate).toLocaleDateString('pt-BR') : '',
      item.activationDate ? new Date(item.activationDate).toLocaleDateString('pt-BR') : '',
      item.deactivationDate ? new Date(item.deactivationDate).toLocaleDateString('pt-BR') : '',
      item.cancellationDate ? new Date(item.cancellationDate).toLocaleDateString('pt-BR') : '',
      item.areaContractType ?? '',
      item.areaHolder ?? '',
      item.infraContractType ?? '',
      item.infraHolder ?? '',
      item.infraType ?? '',
      item.evType ?? '',
      item.evProvider ?? '',
      item.observation ?? '',
      item.justification ?? '',
      item.streetType ?? '',
      item.street ?? '',
      item.number ?? '',
      item.complement ?? '',
      item.neighborhood ?? '',
      item.city ?? '',
      item.state ?? '',
      item.zipCode ?? '',
      item.regional ?? '',
      item.latitude ?? '',
      item.longitude ?? '',
      item.status ?? '',
      item.towerType ?? '',
      item.aevNominal ?? '',
      item.groundArea ?? '',
      item.structureHeight ?? '',
      item.stationId ?? '',
      item.complexOrder ?? '',
      item.thqObservation ?? '',
      item.situation ?? '',
      item.ots ?? '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stations');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stations_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.service.getJob(jobId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const job = await this.service.startImportFromBuffer(file.buffer);
    return job;
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }

  @Delete()
  @HttpCode(204)
  async removeAll(): Promise<void> {
    await this.service.removeAll();
  }
}

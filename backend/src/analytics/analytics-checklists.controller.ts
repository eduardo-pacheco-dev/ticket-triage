import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import { AnalyticsChecklistsService } from './analytics-checklists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CreateAnalyticsChecklistInput } from '@ticket-triage/shared';

const EXCEL_COLUMN_MAP: Record<string, keyof CreateAnalyticsChecklistInput> = {
  Project: 'project',
  Regional: 'regional',
  Estado: 'estado',
  'Site ID': 'siteId',
  OC: 'oc',
  'SMP Name': 'smpName',
  Scope: 'scope',
  SMP_ID: 'smpId',
  Module: 'module',
  'Module ID': 'moduleId',
  'Implementation Vendor': 'implementationVendor',
  'Data Início Módulo': 'moduleStartDate',
  Seção: 'section',
  'Item Checklist': 'checklistItem',
  Status: 'status',
  'Comentário Rejeição': 'rejectionComment',
  'Data Rejeição': 'rejectionDate',
  'Alterado por': 'modifiedBy',
};

function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  return new Date(utcMs);
}

function toIsoDateStr(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 25569) {
    return excelSerialToDate(value).toISOString();
  }

  const str = String(value).trim();
  if (str === '') return undefined;

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return undefined;
}

function parseExcelRows(rows: Record<string, unknown>[]): CreateAnalyticsChecklistInput[] {
  const DATE_FIELDS = new Set(['moduleStartDate', 'rejectionDate']);

  return rows
    .filter((row) => {
      const project = row['Project'];
      return typeof project === 'string' && project.trim().length > 0;
    })
    .map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [excelCol, entityField] of Object.entries(EXCEL_COLUMN_MAP)) {
        const value = row[excelCol];
        if (value === undefined || value === null || String(value).trim() === '') continue;

        if (DATE_FIELDS.has(entityField)) {
          const iso = toIsoDateStr(value);
          if (iso) mapped[entityField] = iso;
        } else {
          mapped[entityField] = String(value).trim();
        }
      }
      return mapped as CreateAnalyticsChecklistInput;
    });
}

@Controller('analytics-checklists')
@UseGuards(JwtAuthGuard)
export class AnalyticsChecklistsController {
  constructor(private readonly service: AnalyticsChecklistsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Nenhum arquivo enviado.');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Planilha vazia.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      cellDates: true,
    } as XLSX.Sheet2JSONOpts);
    const inputs = parseExcelRows(rows);

    if (inputs.length === 0) {
      throw new Error('Nenhum registro válido encontrado na planilha.');
    }

    return this.service.createBatch(inputs);
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

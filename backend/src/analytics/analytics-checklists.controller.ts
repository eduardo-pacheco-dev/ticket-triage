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
import type { Response } from 'express';
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
  const NULL_LITERALS = new Set(['null', 'NULL', 'Null', 'n/a', 'N/A', '-', '']);

  return rows
    .filter((row) => {
      const project = row['Project'];
      return typeof project === 'string' && project.trim().length > 0;
    })
    .map((row) => {
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

  @Get('export')
  async exportExcel(@Res() res: Response) {
    const items = await this.service.findAll();

    const EXCEL_HEADERS = [
      'Project',
      'Regional',
      'Estado',
      'Site ID',
      'OC',
      'SMP Name',
      'Scope',
      'SMP_ID',
      'Module',
      'Module ID',
      'Implementation Vendor',
      'Data Início Módulo',
      'Seção',
      'Item Checklist',
      'Status',
      'Comentário Rejeição',
      'Data Rejeição',
      'Alterado por',
    ];

    const data = items.map((item) => [
      item.project,
      item.regional ?? '',
      item.estado ?? '',
      item.siteId ?? '',
      item.oc ?? '',
      item.smpName ?? '',
      item.scope ?? '',
      item.smpId ?? '',
      item.module ?? '',
      item.moduleId ?? '',
      item.implementationVendor ?? '',
      item.moduleStartDate ? new Date(item.moduleStartDate).toLocaleDateString('pt-BR') : '',
      item.section ?? '',
      item.checklistItem ?? '',
      item.status,
      item.rejectionComment ?? '',
      item.rejectionDate ? new Date(item.rejectionDate).toLocaleDateString('pt-BR') : '',
      item.modifiedBy ?? '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.service.getJob(jobId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('Planilha vazia.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      cellDates: true,
    } as XLSX.Sheet2JSONOpts);
    const inputs = parseExcelRows(rows);

    if (inputs.length === 0) {
      throw new BadRequestException('Nenhum registro válido encontrado na planilha.');
    }

    return this.service.startImport(inputs);
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

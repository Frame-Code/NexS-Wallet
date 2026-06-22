import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsIn(['es', 'en'])
  idioma?: string;

  @IsOptional()
  @IsIn(['dark', 'light'])
  tema?: string;

  @IsOptional()
  @IsString()
  monedaPreferida?: string;
}
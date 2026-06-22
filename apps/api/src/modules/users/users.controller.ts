import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, ForbiddenException, Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    if (req.user.sub !== dto.uid) {
      throw new ForbiddenException('No puedes crear un perfil para otro usuario');
    }
    return this.usersService.create(dto);
  }

  @Get(':uid')
  findOne(@Param('uid') uid: string, @Req() req: any) {
    if (req.user.sub !== uid) {
      throw new ForbiddenException('No puedes ver el perfil de otro usuario');
    }
    return this.usersService.findOne(uid);
  }

  @Get(':uid/settings')
  getSettings(@Param('uid') uid: string, @Req() req: any) {
    if (req.user.sub !== uid) {
      throw new ForbiddenException('No puedes ver la configuración de otro usuario');
    }
    return this.usersService.getSettings(uid);
  }

  @Patch(':uid/settings')
  updateSettings(@Param('uid') uid: string, @Body() dto: UpdateSettingsDto, @Req() req: any) {
    if (req.user.sub !== uid) {
      throw new ForbiddenException('No puedes modificar la configuración de otro usuario');
    }
    return this.usersService.updateSettings(uid, dto);
  }
}
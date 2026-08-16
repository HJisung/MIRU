import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ShortformDto, ShortformListDto } from './shortforms.dto.js';
import { ShortformsService } from './shortforms.service.js';

@ApiTags('shortforms')
@Controller('shortforms')
export class ShortformsController {
  constructor(
    @Inject(ShortformsService) private readonly shortforms: ShortformsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published Shortforms' })
  @ApiOkResponse({ type: ShortformListDto })
  list() {
    return this.shortforms.list();
  }

  @Get(':shortformId')
  @ApiOperation({ summary: 'View one published Shortform' })
  @ApiOkResponse({ type: ShortformDto })
  @ApiNotFoundResponse({
    description: 'Shortform is not published or does not exist',
  })
  findOne(@Param('shortformId', new ParseUUIDPipe()) id: string) {
    return this.shortforms.findOne(id);
  }
}

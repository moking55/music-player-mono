import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { BaseControllerOperations } from '@/common/utils/base-operation';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './interfaces/user.interface';
import { UsersService } from './users.service';

import type { UserEntity } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController extends BaseControllerOperations<
  UserEntity,
  CreateUserDto,
  UpdateUserDto,
  UsersService
> {
  constructor(private readonly usersService: UsersService) {
    super(usersService, 'user');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: UserResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Username already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(@Body() createDto: CreateUserDto) {
    return super.create(createDto);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search users by filter criteria' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [UserResponse],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter criteria',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async search(@Body() filter: Record<string, unknown>) {
    return super.search(filter);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [UserResponse],
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findAll() {
    return super.findAll();
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Get paginated users' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    type: [UserResponse],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findPaginated(page: number = 1, pageSize: number = 10) {
    return super.findPaginated(page, pageSize, 'users');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findOne(@Param('id') id: string) {
    return super.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: UserResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Username already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async update(@Param('id') id: string, @Body() updateDto: UpdateUserDto) {
    return super.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'User successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async remove(@Param('id') id: string) {
    return super.remove(id, true);
  }
}

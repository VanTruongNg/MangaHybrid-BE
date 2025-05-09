import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Manga } from '../manga/schemas/manga.schema';
import { User } from '../auth/schemas/user.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Manga.name) private mangaModel: Model<Manga>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async searchManga(query: string) {
    const searchPattern = query.split('').join('.*');
    const regexPattern = new RegExp(searchPattern, 'i');
    const exactPattern = new RegExp(`^${query}$`, 'i');

    return this.mangaModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'uploader',
          foreignField: '_id',
          as: 'uploader',
        },
      },
      { $unwind: '$uploader' },
      {
        $match: {
          $or: [
            { title: { $regex: regexPattern } },
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { author: { $regex: query, $options: 'i' } },
          ],
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              { $cond: [{ $regexMatch: { input: '$title', regex: exactPattern } }, 10, 0] },    
              { $cond: [{ $regexMatch: { input: '$title', regex: new RegExp(`^${query}`, 'i') } }, 8, 0] },
              { $cond: [{ $regexMatch: { input: '$title', regex: new RegExp(query, 'i') } }, 5, 0] },
              { $cond: [{ $regexMatch: { input: '$title', regex: regexPattern } }, 3, 0] },
              { $cond: [{ $regexMatch: { input: '$description', regex: new RegExp(query, 'i') } }, 1, 0] },
              { $cond: [{ $regexMatch: { input: '$author', regex: exactPattern } }, 7, 0] },
              { $cond: [{ $regexMatch: { input: '$author', regex: new RegExp(query, 'i') } }, 4, 0] },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      {
        $project: {
          _id: 1,
          title: 1,
          coverImg: 1,
          author: 1,
          'uploader._id': 1,
          'uploader.name': 1,
          'uploader.avatarUrl': 1,
          score: 1,
        },
      },
    ]).exec();
  }

  async searchUploader(query: string) {
    const searchPattern = query.split('').join('.*');
    const regexPattern = new RegExp(searchPattern, 'i');
    const exactPattern = new RegExp(`^${query}$`, 'i');

    return this.userModel.aggregate([
      {
        $match: {
          $or: [
            { username: { $regex: regexPattern } },
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              { $cond: [{ $regexMatch: { input: '$name', regex: exactPattern } }, 10, 0] },  // Match chính xác
              { $cond: [{ $regexMatch: { input: '$name', regex: new RegExp(`^${query}`, 'i') } }, 8, 0] },  // Match đầu chuỗi
              { $cond: [{ $regexMatch: { input: '$name', regex: new RegExp(query, 'i') } }, 5, 0] },  // Match một phần
              { $cond: [{ $regexMatch: { input: '$name', regex: regexPattern } }, 3, 0] },  // Fuzzy match
              { $cond: [{ $regexMatch: { input: '$email', regex: new RegExp(query, 'i') } }, 1, 0] },  // Match email
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          avatarUrl: 1,
          score: 1,
        },
      },
    ]).exec();
  }
} 
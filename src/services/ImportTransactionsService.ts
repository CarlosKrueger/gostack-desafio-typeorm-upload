import { getCustomRepository, getRepository, In } from 'typeorm';

import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from './CreateTransactionService';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(fileName: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const createTransaction = new CreateTransactionService();
    const csvFilePath = path.join(uploadConfig.directory, fileName);
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];
    // const transactions: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value || !category) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );

    const categoriesToAdd = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      categoriesToAdd.map(title => ({ title })),
    );
    await categoriesRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const newTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    await fs.promises.unlink(csvFilePath);

    return newTransactions;
  }
}

export default ImportTransactionsService;

import { getCustomRepository, getRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('Invalid transaction type');
    }

    const { total } = await transactionsRepository.getBalance();
    if (type === 'outcome' && total < value) {
      throw new AppError('There is not enough balance for this transaction.');
    }

    let trasactionCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!trasactionCategory) {
      trasactionCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(trasactionCategory);
    }

    const newTransaction = transactionsRepository.create({
      title,
      value,
      type,
      category: trasactionCategory,
    });

    await transactionsRepository.save(newTransaction);
    return newTransaction;
  }
}

export default CreateTransactionService;

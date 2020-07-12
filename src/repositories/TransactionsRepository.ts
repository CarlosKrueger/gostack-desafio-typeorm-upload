import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance: Balance = transactions.reduce(
      (acc: Balance, value: Transaction) => {
        if (value.type === 'income') acc.income += Number(value.value);
        else acc.outcome += Number(value.value);
        return acc;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
    balance.total = balance.income - balance.outcome;
    return balance;
  }
}

export default TransactionsRepository;

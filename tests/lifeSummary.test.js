import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeLife, readDateRange } from '../src/lib/lifeSummary.js';
const start = '2026-09-07', end = '2026-09-13';
test('totals use source records, unique days and calendar boundaries', () => {
  const result = summarizeLife({
    activities: [{date:start,pillar:'lifts'}, {date:start,pillar:'lifts'}, {date:'2026-09-14',pillar:'lifts'}],
    meals: [{date:start,calories:600,protein_g:40}, {date:start,calories:400,protein_g:20}, {date:end,calories:800,protein_g:50}],
    journals: [{date:start,type:'morning'}, {date:start,type:'evening'}, {date:end,type:'reading',pages_read:20}],
    transactions: [{date:start,type:'expense',amount:30}, {date:start,type:'income',amount:1000}],
    weights: [{date:end,weight_lbs:199}, {date:start,weight_lbs:200}]
  },start,end);
  assert.equal(result.trainingDays,1);
  assert.equal(result.mealDays,2);
  assert.equal(result.averageCalories,900);
  assert.equal(result.protein,110);
  assert.equal(result.journalDays,1);
  assert.equal(result.pages,20);
  assert.equal(result.expenses,30);
  assert.equal(result.weightChange,-1);
});
test('missing nutrition and weight data stay unknown', () => {
  const result = summarizeLife({},start,end);
  assert.equal(result.averageCalories,null);
  assert.equal(result.latestWeight,null);
  assert.equal(result.weightChange,null);
});
test('one weigh-in day is not a trend', () => {
  assert.equal(summarizeLife({weights:[{date:start,weight_lbs:200},{date:start,weight_lbs:199}]},start,end).weightChange,null);
});
test('date range loader scopes every page to the user and selected dates', async () => {
  const calls=[];
  const entity={filter:async (...args)=>{calls.push(args);return calls.length===1?Array.from({length:200},(_,id)=>({id})): [{id:200}];}};
  const rows=await readDateRange(entity,'fixture@example.test',start,end,['date']);
  assert.equal(rows.length,201);
  assert.deepEqual(calls[1],[{created_by:'fixture@example.test',date:{$gte:start,$lte:end}},'date',200,200,['date']]);
});
test('failed requests propagate instead of becoming zero totals', async () => {
  await assert.rejects(readDateRange({filter:async()=>{throw new Error('offline');}},'fixture@example.test',start,end), /offline/);
});

import type { ResultDetails, ResultProductInfo } from '../features/sessions/resultsApi'

export const previewResultProducts: ResultProductInfo[] = [
  { product: 'FIRST_CHOOSERS', priceGem: 1, targetRequired: false },
  { product: 'MY_FIRST_CHOICE_RANK', priceGem: 1, targetRequired: false },
  { product: 'USER_RANKINGS', priceGem: 1, targetRequired: true },
  { product: 'ALL_RANKINGS', priceGem: 5, targetRequired: false },
]

export function createPreviewResult(product: ResultDetails['product']): ResultDetails {
  const people = [
    { memberId: 2, alias: '구름산책' },
    { memberId: 3, alias: '달빛수집가' },
  ]
  return {
    product,
    firstChoosers: product === 'FIRST_CHOOSERS' ? people : [],
    myRank: product === 'MY_FIRST_CHOICE_RANK' ? { myFirstChoice: people[0], rankOfMe: 2, submitted: true } : null,
    rankings: product === 'ALL_RANKINGS' || product === 'USER_RANKINGS'
      ? [{ voter: people[0], submitted: true, choices: [{ rank: 1, target: people[1] }] }]
      : [],
  }
}

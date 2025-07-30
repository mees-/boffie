import { useEffect, useMemo, useState } from "react"
import { inferSchema, initParser } from "udsv"

type IncomeRecord = {
  "standardised income (x 1000 euros)": string
  "Single persion": number
}

const incomeRangeRegex = /(-?\d+) and (-?\d+)$/
const firstRowIncomeRangeRegex = /less than (-?\d+)/
const lastRowIncomeRangeRegex = /more than (-?\d+)/

function parseCbsCsv(csv: string) {
  const schema = inferSchema(csv)
  if (
    !schema.cols.some(col => col.name === "Single persion") ||
    !schema.cols.some(col => col.name === "standardised income (x 1000 euros)")
  ) {
    throw new Error("CSV does not contain the required columns")
  }

  const parser = initParser(schema)
  const records = parser.typedObjs(csv) as IncomeRecord[]

  const realTotal = records.reduce((sum, record) => sum + record["Single persion"], 0)
  let cumulativeTotal = 0

  let hasFirstRow = false
  const percentiles = records
    .map(record => {
      const singlePerson = record["Single persion"]
      cumulativeTotal += singlePerson
      const percentile = 100 - (cumulativeTotal / realTotal) * 100

      const incomeRangeStr = record["standardised income (x 1000 euros)"]
      const incomeRangeParsed = incomeRangeRegex.exec(incomeRangeStr)

      let incomeRange: [number, number]
      if (incomeRangeParsed != null) {
        incomeRange = [parseInt(incomeRangeParsed[1]), parseInt(incomeRangeParsed[2])]
      } else if (firstRowIncomeRangeRegex.exec(incomeRangeStr) != null) {
        if (!hasFirstRow) {
          incomeRange = [-Infinity, parseInt(firstRowIncomeRangeRegex.exec(incomeRangeStr)![1])]
          hasFirstRow = true
        } else {
          throw new Error("Double first row regex match")
        }
      } else if (lastRowIncomeRangeRegex.exec(incomeRangeStr) != null) {
        incomeRange = [parseInt(lastRowIncomeRangeRegex.exec(incomeRangeStr)![1]), Infinity]
      } else {
        throw new Error(`Invalid income range: ${incomeRangeStr}`)
      }

      return {
        incomeMin: incomeRange[0] * 1000,
        percentile,
      }
    })
    .sort((a, b) => b.incomeMin - a.incomeMin)

  if (!hasFirstRow) {
    throw new Error("No first row, with income minimum of -∞ found")
  }

  return (income: number) => {
    const incomeMatch = percentiles.find(p => income >= p.incomeMin)!
    if (incomeMatch == null) {
      console.error("percentiles:", percentiles)
      throw new Error(`No income match found for income ${income}`)
    }

    return incomeMatch.percentile
  }
}

const useGetIncomePercentile = () => {
  const [incomeDistribution, setIncomeDistribution] = useState<string | null>(null)
  const getIncomePercentile = useMemo(() => {
    if (incomeDistribution == null) {
      return null
    }
    return parseCbsCsv(incomeDistribution)
  }, [incomeDistribution])

  useEffect(() => {
    fetch("/income-distribution.csv")
      .then(res => res.text())
      .then(setIncomeDistribution)
  }, [])

  return getIncomePercentile
}

export const useIncomePercentile = (yearlyWage: number) => {
  const getIncomePercentile = useGetIncomePercentile()
  if (getIncomePercentile == null || isNaN(yearlyWage)) {
    return null
  } else {
    return getIncomePercentile(yearlyWage)
  }
}

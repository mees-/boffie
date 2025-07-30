import { useEffect, useMemo, useState } from "react"
import { useIncomePercentile } from "./cbs-income-distribution"
import { plausible } from "./plausible"

function App() {
  useEffect(() => {
    plausible.enableAutoPageviews()
  }, [])

  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [wageStr, setWageStr] = useState("0")
  const wage = parseFloat(wageStr)
  const [wageFrequency, setWageFrequency] = useState("monthly")

  const [hoursPerPeriod, setHoursPerPeriod] = useState(24)
  const [periodsPerYear, setPeriodsPerYear] = useState(52)

  const [hasHolidayPay, setHasHolidayPay] = useState(false)
  const [holidayPercentage, setHolidayPercentage] = useState(0)

  const yearlyWage = useMemo(() => {
    const wageWithHolidayPay = wage * (1 + (hasHolidayPay ? holidayPercentage / 100 : 0))
    if (wageFrequency === "yearly") {
      return wageWithHolidayPay
    }
    if (wageFrequency === "monthly") {
      return monthyToYearly(wageWithHolidayPay)
    }
    if (wageFrequency === "hourly") {
      return hourlyToYearly(wageWithHolidayPay, hoursPerPeriod, periodsPerYear)
    }
    throw new Error("Invalid wage frequency")
  }, [wage, wageFrequency, hoursPerPeriod, periodsPerYear, holidayPercentage, hasHolidayPay])

  const wagePerMinute = yearlyToMinute(yearlyWage)

  const incomePercentile = useIncomePercentile(yearlyWage)

  useEffect(() => {
    if (hasSubmitted) {
      plausible.trackEvent("calculate", {
        props: {
          yearlyWage,
          wageFrequency,
          hoursPerPeriod,
          periodsPerYear,
          hasHolidayPay,
          holidayPercentage,
        },
      })
    }
  }, [yearlyWage, wageFrequency, hoursPerPeriod, periodsPerYear, hasHolidayPay, holidayPercentage, hasSubmitted])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <main className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {!hasSubmitted && (
          <form
            onSubmit={e => {
              e.preventDefault()
              setHasSubmitted(true)
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <label className="block">
                <span className="text-gray-700 font-medium text-sm mb-2 block">Enter your wage:</span>
                <input
                  value={wageStr}
                  onChange={e => setWageStr(e.target.value)}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="0"
                />
              </label>

              <label className="block">
                <span className="text-gray-700 font-medium text-sm mb-2 block">Wage per:</span>
                <select
                  value={wageFrequency}
                  onChange={e => setWageFrequency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </label>

              {wageFrequency === "hourly" && (
                <div className="flex flex-row items-center gap-2">
                  <label className="">I work:</label>

                  <input
                    value={hoursPerPeriod}
                    onChange={e => setHoursPerPeriod(parseInt(e.target.value))}
                    type="number"
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="0"
                  />
                  <label className="">hours per:</label>
                  <select
                    value={periodsPerYear}
                    onChange={e => setPeriodsPerYear(parseInt(e.target.value))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="52">Week</option>
                    <option value="12">Month</option>
                    <option value="13">4 Weeks</option>
                  </select>
                </div>
              )}
              <label className="flex flex-row items-center gap-2">
                <input type="checkbox" checked={hasHolidayPay} onChange={e => setHasHolidayPay(e.target.checked)} />
                <span>Extra holiday pay?</span>
              </label>
              {hasHolidayPay && (
                <label className="flex flex-row items-center gap-2">
                  <span>Holiday pay percentage:</span>
                  <input
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    type="number"
                    value={holidayPercentage}
                    onChange={e => setHolidayPercentage(parseInt(e.target.value))}
                  />
                  <span>%</span>
                </label>
              )}
            </div>

            <button
              disabled={
                isNaN(wage) ||
                (wageFrequency === "hourly" && hoursPerPeriod === 0) ||
                (wageFrequency === "hourly" && periodsPerYear === 0)
              }
              type="submit"
              className="w-full bg-blue-600 enabled:hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-md enabled:hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Calculate
            </button>
          </form>
        )}

        {hasSubmitted && (
          <div className="text-center space-y-6">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <p className="text-2xl font-bold text-blue-900">
                {new Intl.NumberFormat(navigator.language, {
                  style: "currency",
                  currency: "EUR",
                }).format(wagePerMinute)}
              </p>
              <p className="text-blue-700 text-sm mt-1">per living minute</p>
              {incomePercentile != null && (
                <p className="text-sm text-gray-500">
                  This puts you in the top {incomePercentile.toFixed(1)}% of dutch single-person households
                </p>
              )}
            </div>
            <button
              onClick={() => setHasSubmitted(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Calculate Again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

const yearlyToMinute = (wage: number) => wage / (365 * 24 * 60)
const monthyToYearly = (wage: number) => wage * 12
const hourlyToYearly = (wage: number, hoursPerPeriod: number, periodsPerYear: number) =>
  wage * hoursPerPeriod * periodsPerYear

export default App

import { useMemo } from "react"
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { useIncomePercentile } from "./cbs-income-distribution"

interface WageFormData {
  wage: number
  wageFrequency: "yearly" | "monthly" | "hourly"
  hoursPerPeriod: number
  periodsPerYear: number
  hasHolidayPay: boolean
  holidayPercentage: number
}

function App() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <main className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <Routes>
          <Route path="/" element={<Intro />} />
          <Route path="/calculate" element={<WageForm />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </main>
    </div>
  )
}

function Intro() {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">What's Your Time Worth?</h1>

        <p className="text-gray-600 leading-relaxed">
          Ever wondered how much you earn for every minute you're alive? This calculator converts your salary into
          money-per-minute-alive and shows where you stand among Dutch single-person households.
        </p>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Fun fact:</strong> Whether you're working, sleeping, or just breathing, you're earning money for
            every minute of your existence.
          </p>
        </div>
      </div>

      <Link
        to="/calculate"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
      >
        Calculate Your Money Per Minute
      </Link>
    </div>
  )
}

function WageForm() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WageFormData>({
    defaultValues: {
      wage: 0,
      wageFrequency: "monthly",
      hoursPerPeriod: 24,
      periodsPerYear: 52,
      hasHolidayPay: false,
      holidayPercentage: 0,
    },
  })

  const watchedValues = watch()
  const { wage, wageFrequency, hoursPerPeriod, periodsPerYear, hasHolidayPay, holidayPercentage } = watchedValues

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

  const onSubmit = () => {
    const resultUrl = new URLSearchParams({
      yearlyWage: yearlyWage.toString(),
    })

    navigate({
      pathname: "/results",
      search: resultUrl.toString(),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <label className="block">
          <span className="text-gray-700 font-medium text-sm mb-2 block">Enter your wage:</span>
          <input
            {...register("wage", {
              required: "Wage is required",
              valueAsNumber: true,
            })}
            type="number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="0"
          />
          {errors.wage && <p className="text-red-500 text-sm mt-1">{errors.wage.message}</p>}
        </label>

        <label className="block">
          <span className="text-gray-700 font-medium text-sm mb-2 block">Wage per:</span>
          <select
            {...register("wageFrequency")}
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
              {...register("hoursPerPeriod", {
                required: "Hours per period is required",
                min: { value: 1, message: "Must be at least 1 hour" },
                valueAsNumber: true,
              })}
              type="number"
              className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="0"
            />
            <label className="">hours per:</label>
            <select
              {...register("periodsPerYear", { valueAsNumber: true })}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value={52}>Week</option>
              <option value={12}>Month</option>
              <option value={13}>4 Weeks</option>
            </select>
          </div>
        )}
        <label className="flex flex-row items-center gap-2">
          <input type="checkbox" {...register("hasHolidayPay")} />
          <span>Extra holiday pay?</span>
        </label>
        {hasHolidayPay && (
          <label className="flex flex-row items-center gap-2">
            <span>Holiday pay percentage:</span>
            <input
              {...register("holidayPercentage", {
                min: { value: 0, message: "Percentage must be 0 or higher" },
                max: { value: 100, message: "Percentage cannot exceed 100%" },
                valueAsNumber: true,
              })}
              className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              type="number"
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
  )
}

function Results() {
  const navigate = useNavigate()
  const location = useLocation()

  const yearlyWage = Number(new URLSearchParams(location.search).get("yearlyWage"))
  const incomePercentile = useIncomePercentile(yearlyWage)

  const wagePerMinute = yearlyToMinute(yearlyWage)

  return (
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
        onClick={() => navigate("/")}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
      >
        Calculate Again
      </button>
    </div>
  )
}

const yearlyToMinute = (wage: number) => wage / (365 * 24 * 60)
const monthyToYearly = (wage: number) => wage * 12
const hourlyToYearly = (wage: number, hoursPerPeriod: number, periodsPerYear: number) =>
  wage * hoursPerPeriod * periodsPerYear

export default App

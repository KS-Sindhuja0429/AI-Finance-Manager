import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { FiTrendingUp, FiTrendingDown, FiSave, FiCpu, FiAlertCircle } from "react-icons/fi";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, MONTH_NAMES } from "../utils/format";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Tooltip, Legend);

export default function Forecast() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [neural, setNeural] = useState(null);
  const [neuralLoading, setNeuralLoading] = useState(true);
  const [neuralError, setNeuralError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get("/forecast")
      .then((res) => mounted && setData(res.data))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const runNeuralForecast = () => {
    setNeuralLoading(true);
    setNeuralError(null);
    api
      .get("/ml/expense-forecast?days=14")
      .then((res) => setNeural(res.data))
      .catch(() => setNeuralError("The neural network service is unavailable right now."))
      .finally(() => setNeuralLoading(false));
  };

  useEffect(() => {
    runNeuralForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return (
      <Layout title="Forecast">
        <Loader />
      </Layout>
    );
  }

  const historyLabels = data.income_history.map((h) => `${MONTH_NAMES[h.month - 1]} '${String(h.year).slice(2)}`);
  const nextLabel = `${MONTH_NAMES[data.next_month.month - 1]} '${String(data.next_month.year).slice(2)} (forecast)`;

  const cashFlowData = {
    labels: [...historyLabels, nextLabel],
    datasets: [
      {
        label: "Income",
        data: [...data.income_history.map((h) => h.total), data.predicted_income],
        borderColor: "#2DD4BF",
        backgroundColor: "rgba(45,212,191,0.15)",
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: "Expense",
        data: [...data.expense_history.map((h) => h.total), data.predicted_expense],
        borderColor: "#FB7185",
        backgroundColor: "rgba(251,113,133,0.15)",
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };

  const balanceData = {
    labels: [...historyLabels, nextLabel],
    datasets: [
      {
        label: "Cumulative Balance",
        data: [
          ...data.cash_flow_history.map((c) => c.cumulative_balance),
          data.projected_cumulative_balance,
        ],
        borderColor: "#F5B14C",
        backgroundColor: "rgba(245,177,76,0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const chartTextColor = "#7C89A3";
  const commonOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#DCE2EE" } } },
    scales: {
      x: { ticks: { color: chartTextColor }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: chartTextColor }, grid: { color: "rgba(255,255,255,0.04)" } },
    },
  };

  let neuralChartData = null;
  if (neural && !neural.insufficient_data) {
    const histLabels = neural.historical_daily_expenses.slice(-30).map((h) => h.date.slice(5));
    const histValues = neural.historical_daily_expenses.slice(-30).map((h) => h.amount);
    const forecastLabels = neural.forecast_daily_expenses.map((f) => f.date.slice(5));
    const forecastValues = neural.forecast_daily_expenses.map((f) => f.amount);

    neuralChartData = {
      labels: [...histLabels, ...forecastLabels],
      datasets: [
        {
          label: "Actual daily expense",
          data: [...histValues, ...Array(forecastValues.length).fill(null)],
          borderColor: "#7C89A3",
          backgroundColor: "rgba(124,137,163,0.1)",
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: "LSTM prediction",
          data: [...Array(histValues.length).fill(null), ...forecastValues],
          borderColor: "#2DD4BF",
          backgroundColor: "rgba(45,212,191,0.15)",
          borderDash: [4, 3],
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    };
  }

  return (
    <Layout title="Forecast">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={FiTrendingUp}
            label={`Predicted Income (${MONTH_NAMES[data.next_month.month - 1]})`}
            value={formatCurrency(data.predicted_income, currency)}
            accent="pulse"
          />
          <StatCard
            icon={FiTrendingDown}
            label={`Predicted Expense (${MONTH_NAMES[data.next_month.month - 1]})`}
            value={formatCurrency(data.predicted_expense, currency)}
            accent="coral"
          />
          <StatCard
            icon={FiSave}
            label="Predicted Savings"
            value={formatCurrency(data.predicted_savings, currency)}
            accent="gold"
          />
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-display font-semibold text-mist-100 mb-1">Future Cash Flow</h3>
          <p className="text-xs text-mist-400 mb-4">
            Based on a weighted average of your last 6 months, weighted toward the most recent
          </p>
          <Line data={cashFlowData} options={commonOptions} />
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-display font-semibold text-mist-100 mb-1">Projected Balance Trend</h3>
          <p className="text-xs text-mist-400 mb-4">
            Cumulative net balance including next month's projection
          </p>
          <Line data={balanceData} options={commonOptions} />
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-1">
            <FiCpu className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Neural Network Forecast</h3>
          </div>
          <p className="text-xs text-mist-400 mb-4">
            An LSTM (Long Short-Term Memory) neural network, built with TensorFlow/Keras and
            trained on-demand on your own daily expense history, predicting day-by-day spending
            for the next two weeks.
          </p>

          {neuralLoading ? (
            <Loader />
          ) : neuralError ? (
            <div className="flex items-center gap-2 text-coral text-sm py-6">
              <FiAlertCircle size={16} /> {neuralError}
            </div>
          ) : neural?.insufficient_data ? (
            <div className="flex items-center gap-2 text-mist-300 text-sm py-6">
              <FiAlertCircle size={16} className="text-gold shrink-0" />
              {neural.message}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <p className="text-xs text-mist-400">Model</p>
                  <p className="text-sm text-mist-100 font-medium">{neural.model}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <p className="text-xs text-mist-400">Final training loss (MSE)</p>
                  <p className="text-sm text-mist-100 font-medium">{neural.final_training_loss}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <p className="text-xs text-mist-400">Predicted next {neural.forecast_days} days</p>
                  <p className="text-sm text-mist-100 font-medium">
                    {formatCurrency(neural.predicted_total, currency)}
                  </p>
                </div>
              </div>
              {neuralChartData && <Line data={neuralChartData} options={commonOptions} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}


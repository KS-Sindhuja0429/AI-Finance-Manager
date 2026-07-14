import { motion } from "framer-motion";

const ACCENTS = {
  pulse: "text-pulse bg-pulse/10 border-pulse/20",
  gold: "text-gold bg-gold/10 border-gold/20",
  coral: "text-coral bg-coral/10 border-coral/20",
  mist: "text-mist-100 bg-white/5 border-white/10",
};

export default function StatCard({ icon: Icon, label, value, sub, accent = "pulse", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-panel p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-mist-400">{label}</span>
        {Icon && (
          <span className={`w-9 h-9 rounded-lg border flex items-center justify-center ${ACCENTS[accent]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-semibold text-mist-100">{value}</div>
      {sub && <div className="text-xs text-mist-400">{sub}</div>}
    </motion.div>
  );
}

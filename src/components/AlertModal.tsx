import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { useApp } from "../context/AppContext";

export const AlertModal: React.FC = () => {
  const { alertModal, closeAlert } = useApp();
  const { isOpen, message, type } = alertModal;

  if (!isOpen) return null;

  // Configuration based on alert type
  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />,
      color: "border-emerald-500/30 shadow-emerald-500/10",
      btnBg: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20",
      title: "Thành công"
    },
    error: {
      icon: <XCircle className="w-12 h-12 text-rose-400" />,
      color: "border-rose-500/30 shadow-rose-500/10",
      btnBg: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20",
      title: "Lỗi"
    },
    warning: {
      icon: <AlertTriangle className="w-12 h-12 text-amber-400" />,
      color: "border-amber-500/30 shadow-amber-500/10",
      btnBg: "bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-600/20",
      title: "Cảnh báo"
    },
    info: {
      icon: <Info className="w-12 h-12 text-blue-400" />,
      color: "border-blue-500/30 shadow-blue-500/10",
      btnBg: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
      title: "Thông báo"
    }
  };

  const currentConfig = typeConfig[type] || typeConfig.info;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAlert}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`relative w-full max-w-sm overflow-hidden rounded-2xl border bg-neutral-950/95 text-slate-100 p-6 shadow-2xl ${currentConfig.color}`}
        >
          {/* Close button */}
          <button
            onClick={closeAlert}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon & Message */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className="mb-4">
              {currentConfig.icon}
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-2">
              {currentConfig.title}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto mb-6 px-1">
              {message}
            </p>

            <button
              onClick={closeAlert}
              className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 active:scale-95 ${currentConfig.btnBg}`}
            >
              Xác nhận
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

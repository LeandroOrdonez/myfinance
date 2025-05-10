import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Delete } from "lucide-react";

interface PinUnlockProps {
  onUnlock: () => void;
  correctPin?: string[];
}

export const PinUnlock: React.FC<PinUnlockProps> = ({ 
  onUnlock,
  correctPin = ["1", "2", "3", "4"] // Default PIN
}) => {
  const [pin, setPin] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const maxAttempts = 3;
  const lockoutTime = 30; // seconds

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
    }

    if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }

    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  useEffect(() => {
    if (isUnlocked) {
      onUnlock();
    }
  }, [isUnlocked, onUnlock]);

  const handleKeyPress = (key: string) => {
    if (isLocked || isUnlocked || pin.length >= 4) return;

    const newPin = [...pin, key];
    setPin(newPin);

    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const validatePin = (pinToCheck: string[]) => {
    const isPinCorrect = pinToCheck.join("") === correctPin.join("");

    if (isPinCorrect) {
      setStatus("success");
      setTimeout(() => {
        setIsUnlocked(true);
      }, 1000);
    } else {
      setStatus("error");
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        setIsLocked(true);
        setLockTimer(lockoutTime);
      }

      setTimeout(() => {
        setPin([]);
        setStatus("idle");
      }, 1000);
    }
  };

  const handleDelete = () => {
    if (isLocked || isUnlocked) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    setPin([]);
    setStatus("idle");
    setIsUnlocked(false);
    setAttempts(0);
    setIsLocked(false);
    setLockTimer(0);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center justify-center gap-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Unlocked Successfully</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-medium"
            >
              Lock Again
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-8 w-full max-w-sm"
          >
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Enter PIN to Unlock</h1>

            {isLocked ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="text-red-500 font-medium">Too many failed attempts</div>
                <div className="text-gray-600 dark:text-gray-300">Try again in {lockTimer} seconds</div>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className="flex gap-4 mb-8"
                  animate={
                    status === "error"
                      ? {
                          x: [0, -10, 10, -10, 10, 0],
                          transition: { duration: 0.5 },
                        }
                      : {}
                  }
                >
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8 }}
                      animate={{
                        scale: pin[i] ? 1 : 0.8,
                        backgroundColor:
                          status === "success"
                            ? "#10b981"
                            : status === "error"
                              ? "#ef4444"
                              : pin[i]
                                ? "#1f2937"
                                : "#e5e7eb",
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-300"
                    >
                      {pin[i] && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 bg-white rounded-full"
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>

                <div className="grid grid-cols-3 gap-4 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "delete"].map((key, index) => {
                    if (key === "") {
                      return <div key={index} />;
                    }

                    if (key === "delete") {
                      return (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleDelete}
                          className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto"
                          disabled={isLocked}
                        >
                          <Delete className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </motion.button>
                      );
                    }

                    return (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleKeyPress(key.toString())}
                        className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center text-2xl font-medium text-gray-800 dark:text-gray-200 mx-auto"
                        disabled={isLocked}
                      >
                        {key}
                      </motion.button>
                    );
                  })}
                </div>

                {attempts > 0 && !isLocked && (
                  <div className="text-red-500 text-sm mt-4">
                    Failed attempts: {attempts}/{maxAttempts}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicators (only visible during validation) */}
      <AnimatePresence>
        {status === "success" && !isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            PIN correct! Unlocking...
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            Incorrect PIN. Try again.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrueFocus from './TrueFocus';

const ANIM_DURATION = 0.5;
const PAUSE = 1.0;
const WORDS = 3; // "Sea Autonomous Observer"
const VISIBLE_MS = WORDS * (ANIM_DURATION + PAUSE) * 1000; // 4500ms

// Module-level flag: resets on hard refresh, survives SPA navigation
export let loaderShown = false;

const LandingLoader = ({ onDone }) => {
  const [visible, setVisible] = useState(!loaderShown);

  useEffect(() => {
    if (loaderShown) {
      onDone();
      return;
    }
    loaderShown = true;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 650);
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="landing-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black"
        >
          <TrueFocus
            sentence="Sea Autonomous Observer"
            blurAmount={6}
            borderColor="#38bdf8"
            glowColor="rgba(56,189,248,0.55)"
            animationDuration={ANIM_DURATION}
            pauseBetweenAnimations={PAUSE}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LandingLoader;

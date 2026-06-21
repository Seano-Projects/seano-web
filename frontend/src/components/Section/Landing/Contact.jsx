import { useState } from "react";
import { motion } from "framer-motion";
import { FaInstagram, FaYoutube, FaEnvelope, FaPaperPlane, FaGithub } from "react-icons/fa6";
import Gradient1 from "../../../assets/Gradient1.webp";
import { API_ENDPOINTS } from "../../../config";

const socials = [
  {
    icon: FaInstagram,
    label: "Instagram",
    handle: "@seano.usv",
    href: "https://www.instagram.com/seano.usv/",
    color: "hover:border-pink-500/50 hover:bg-pink-500/10",
    iconColor: "group-hover:text-pink-400",
  },
  {
    icon: FaYoutube,
    label: "YouTube",
    handle: "Coming soon",
    href: null,
    color: "hover:border-red-500/50 hover:bg-red-500/10",
    iconColor: "group-hover:text-red-400",
  },
  {
    icon: FaGithub,
    label: "GitHub",
    handle: "Seano-Projects",
    href: "https://github.com/Seano-Projects",
    color: "hover:border-white/30 hover:bg-white/8",
    iconColor: "group-hover:text-white",
  },
  {
    icon: FaEnvelope,
    label: "Email",
    handle: "seanousv@gmail.com",
    href: "mailto:seanousv@gmail.com",
    color: "hover:border-primary/50 hover:bg-primary/10",
    iconColor: "group-hover:text-primary",
  },
];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, message } = form;
    if (!name || !email || !message || loading) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(API_ENDPOINTS.CONTACT.SEND, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", message: "" });
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(data.error || "error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden pt-16 sm:pt-20 pb-20 sm:pb-28 px-4 sm:px-8 lg:px-0 scroll-mt-20"
      id="contact"
    >
      {/* Gradient decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 sm:w-150 h-96 sm:h-150 pointer-events-none z-0 opacity-15">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[120px]" />
      </div>
      <div className="absolute bottom-0 right-0 w-72 sm:w-120 h-72 sm:h-120 pointer-events-none z-0 opacity-10">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="space-y-4 max-w-lg mb-14"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-primary" />
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              Get In Touch
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Contact Us
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Have a question, collaboration idea, or just want to say hello?
            We'd love to hear from you. Reach out through the form or find us on social media.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
          {/* Left — Contact Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 text-xs font-medium tracking-wide uppercase">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:bg-white/8 transition-all duration-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 text-xs font-medium tracking-wide uppercase">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:bg-white/8 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-gray-400 text-xs font-medium tracking-wide uppercase">
                Message
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us what's on your mind..."
                required
                className="flex-1 min-h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:bg-white/8 transition-all duration-200 resize-none"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="relative w-full flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm text-white overflow-hidden bg-linear-to-r from-primary via-secondary to-primary bg-size-[200%_100%] bg-left hover:bg-right transition-all duration-500 shadow-lg hover:shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FaPaperPlane className="w-3.5 h-3.5" />
              )}
              {loading ? "Sending..." : "Send Message"}
            </motion.button>

            {status === "success" && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-primary/80"
              >
                Message sent! We'll get back to you soon.
              </motion.p>
            )}
            {status && status !== "success" && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-red-400/80"
              >
                {status === "error"
                  ? "Something went wrong. Please try again."
                  : status}
              </motion.p>
            )}
          </motion.form>

          {/* Right — Socials + info */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 gap-3">
              {socials.map(({ icon: Icon, label, handle, href, color, iconColor }, i) => {
                const Wrapper = href ? "a" : "div";
                const linkProps = href
                  ? { href, target: "_blank", rel: "noopener noreferrer" }
                  : {};

                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.45 }}
                  >
                    <Wrapper
                      {...linkProps}
                      className={`group flex flex-col items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-4 transition-all duration-300 ${color} backdrop-blur-sm ${href ? "cursor-pointer" : "cursor-default opacity-60"}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center transition-colors duration-300 group-hover:border-white/20">
                        <Icon className={`w-4 h-4 text-gray-400 transition-colors duration-300 ${iconColor}`} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{label}</p>
                        <p className="text-gray-500 text-xs mt-0.5 truncate max-w-28">{handle}</p>
                      </div>
                    </Wrapper>
                  </motion.div>
                );
              })}
            </div>

            <div className="bg-white/3 border border-white/8 rounded-2xl px-6 py-5 space-y-2">
              <p className="text-gray-500 text-xs font-semibold tracking-widest uppercase">Response Time</p>
              <p className="text-white text-sm leading-relaxed">
                We typically respond within <span className="text-primary font-semibold">1–2 business days</span>. For urgent matters, feel free to reach us directly via email.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

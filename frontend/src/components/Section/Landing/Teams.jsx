import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Gradient1 from "../../../assets/Gradient1.webp";
import { FaLinkedin, FaGithub, FaTwitter, FaInstagram } from "react-icons/fa6";
import { API_ENDPOINTS, API_BASE_URL } from "../../../config";
import { useTranslation } from "../../../hooks/useTranslation";

const avatarGrads = [
  "from-sky-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-700",
  "from-cyan-500 to-blue-600",
];

const MemberCard = ({ member, index }) => {
  const photoUrl = member.photo
    ? member.photo.startsWith("http")
      ? member.photo
      : `${API_BASE_URL}${member.photo}`
    : null;

  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const socials = [
    { key: "linkedin",  href: member.linkedin,  Icon: FaLinkedin,  hover: "hover:text-sky-400" },
    { key: "github",    href: member.github,     Icon: FaGithub,    hover: "hover:text-white" },
    { key: "twitter",   href: member.twitter,    Icon: FaTwitter,   hover: "hover:text-sky-300" },
    { key: "instagram", href: member.instagram,  Icon: FaInstagram, hover: "hover:text-pink-400" },
  ].filter((s) => s.href);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.5 }}
      className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all duration-500 cursor-default"
      style={{ aspectRatio: "3/4" }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={member.name}
          className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 scale-100 group-hover:scale-105 transition-all duration-700"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-linear-to-br ${avatarGrads[index % avatarGrads.length]} flex items-center justify-center`}
        >
          <span className="text-5xl font-black text-white/30">{initials}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
        {socials.length > 0 && (
          <div className="flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            {socials.map(({ key, href, Icon, hover }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-gray-400 ${hover} transition-colors duration-200`}
              >
                <Icon className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}

        <div>
          <p className="text-white font-bold text-sm leading-tight">{member.name}</p>
          <p className="text-gray-400 text-[11px] leading-snug mt-0.5">{member.role}</p>
          {member.division && (
            <span className="inline-block mt-1.5 text-[9px] font-semibold tracking-wider uppercase text-primary/80">
              {member.division}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Teams = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(API_ENDPOINTS.TEAM.LIST)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setMembers(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <div className="relative w-full overflow-hidden pt-16 sm:pt-20 pb-10 sm:pb-16 px-4 sm:px-8 lg:px-0 scroll-mt-20" id="team">
      <div className="absolute bottom-0 left-0 w-72 sm:w-150 h-72 sm:h-150 pointer-events-none z-0 opacity-20">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[120px]" />
      </div>
      <div className="absolute top-0 right-0 w-60 sm:w-125 h-60 sm:h-125 pointer-events-none z-0 opacity-15">
        <img src={Gradient1} alt="" className="w-full h-full object-contain blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="space-y-4 max-w-lg mb-12"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-primary" />
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              {t("landing.teams.label")}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {t("landing.teams.heading")}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {t("landing.teams.description")}
          </p>
        </motion.div>

        {!loaded ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 flex flex-col items-start gap-2">
            <p className="text-gray-600 text-sm">{t("landing.teams.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {members.map((member, i) => (
              <MemberCard key={member.id} member={member} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;

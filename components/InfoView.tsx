import React from 'react';
import { BookOpen } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';
import { INFO } from '../i18n/info.ts';

/** `**bold**` → <strong> */
const rich = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-black text-slate-800">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>);

/** "Info" tab: how tournaments work, for the organizer */
const InfoView: React.FC = () => {
  const { t, lang } = useI18n();
  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
        <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-indigo-600" /> {t('info.title')}
      </h2>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {INFO[lang].map(section => (
          <section key={section.title} className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-200 shadow-sm p-5 md:p-8">
            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-3 md:mb-4">{section.title}</h3>
            <ul className="space-y-2.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm md:text-base text-slate-600 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span>{rich(item)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default InfoView;

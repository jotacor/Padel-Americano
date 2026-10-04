import React from 'react';
import { useI18n } from '../i18n/I18nContext.tsx';
import { INFO, type InfoBlock } from '../i18n/info.ts';

/** `**bold**` → <strong> */
const rich = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>);

const Block: React.FC<{ block: InfoBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'p':
      return <p>{rich(block.text)}</p>;
    case 'steps':
      return (
        <ol className="space-y-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-600 text-white text-sm font-black flex items-center justify-center">{i + 1}</span>
              <span className="pt-0.5">{rich(item)}</span>
            </li>
          ))}
        </ol>
      );
    case 'list':
      return (
        <ul className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <span>{rich(item)}</span>
            </li>
          ))}
        </ul>
      );
    case 'choose':
      return (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {block.rows.map(([situation, choice], i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3">
              <span className="flex-1">{situation}</span>
              <span className="text-indigo-700 sm:text-right">→ {rich(choice)}</span>
            </div>
          ))}
        </div>
      );
  }
};

/** "Info" tab: a short user manual, read top to bottom */
const InfoView: React.FC = () => {
  const { t, lang } = useI18n();
  return (
    <article className="max-w-3xl mx-auto bg-white rounded-3xl md:rounded-[3rem] border border-slate-200 shadow-sm p-6 md:p-12">
      <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 md:mb-10">{t('info.title')}</h2>
      <div className="space-y-8 md:space-y-10 text-slate-600 text-base md:text-lg leading-relaxed">
        {INFO[lang].map(section => (
          <section key={section.title} className="space-y-4">
            <h3 className="text-lg md:text-xl font-black text-slate-900">{section.title}</h3>
            {section.blocks.map((block, i) => <Block key={i} block={block} />)}
          </section>
        ))}
      </div>
    </article>
  );
};

export default InfoView;

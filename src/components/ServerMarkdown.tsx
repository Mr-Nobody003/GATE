import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import 'katex/dist/katex.min.css';

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function ServerMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
      components={{
        p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
        img: ({node, src, ...props}) => {
          const imgUrl = typeof src === 'string' && src.startsWith('/') && !src.startsWith('/GATE') ? `/GATE${src}` : src;
          return <img src={imgUrl as string} style={{maxWidth: '100%', height: 'auto', display: 'block', margin: '2rem auto', borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'}} {...props} />;
        },
        h1: ({node, ...props}) => <h1 className="font-heading text-3xl font-black text-indigo-900 dark:text-indigo-300 mt-10 mb-6" {...props} />,
        h2: ({node, children, ...props}) => (
          <h2
            id={slugify(String(children))}
            className="font-heading scroll-mt-24 flex items-center gap-3 text-2xl font-extrabold text-neutral-900 dark:text-white mt-12 mb-5 pt-8 border-t border-neutral-200 dark:border-neutral-800 first:mt-0 first:pt-0 first:border-t-0"
            {...props}
          >
            <span className="w-1.5 h-6 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
            {children}
          </h2>
        ),
        h3: ({node, ...props}) => (
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-6 mb-2" {...props} />
        ),
        h4: ({node, ...props}) => (
          <h4 className="text-[0.95rem] font-bold text-neutral-800 dark:text-neutral-200 mt-5 mb-2 pl-3 border-l-2 border-indigo-300 dark:border-indigo-700" {...props} />
        ),
        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 space-y-2.5 my-5 marker:text-indigo-400 dark:marker:text-indigo-500" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 space-y-2.5 my-5 marker:text-indigo-400 dark:marker:text-indigo-500 marker:font-bold" {...props} />,
        li: ({node, ...props}) => <li className="text-neutral-700 dark:text-neutral-300 pl-1" {...props} />,
        strong: ({node, ...props}) => <strong className="font-extrabold text-indigo-700 dark:text-indigo-400" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 my-6 italic text-neutral-600 dark:text-neutral-400 rounded-r-lg" {...props} />
      }}
    >
      {content.replace(/<type>/g, '&lt;type&gt;').replace(/<filename>/g, '&lt;filename&gt;')}
    </ReactMarkdown>
  );
}

"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

const toolbarButton = (active) =>
  `rounded-md border px-2 py-1 text-xs ${
    active
      ? "border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-indigo-200"
      : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
  }`;

export default function RichTextEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true })
    ],
    content: content || "",
    onUpdate: ({ editor: editorInstance }) => {
      onChange?.(editorInstance.getHTML());
    }
  });

  useEffect(() => {
    if (!editor || content === undefined) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content || "", false);
    }
  }, [editor, content]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL", previous);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url.trim() }).run();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <button
          type="button"
          className={toolbarButton(editor?.isActive("bold"))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={toolbarButton(editor?.isActive("italic"))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={toolbarButton(editor?.isActive("underline"))}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          Underline
        </button>
        <button
          type="button"
          className={toolbarButton(editor?.isActive("bulletList"))}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Bullet list
        </button>
        <button
          type="button"
          className={toolbarButton(editor?.isActive("heading", { level: 2 }))}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Heading
        </button>
        <button type="button" className={toolbarButton(editor?.isActive("link"))} onClick={setLink}>
          Link
        </button>
      </div>
      <EditorContent editor={editor} className="min-h-[120px] text-sm text-slate-900 dark:text-slate-100" />
    </div>
  );
}

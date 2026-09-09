export const knowledgeFileName = (file: File): string => file.webkitRelativePath || file.name;
export const supportedKnowledgeFile = (file: File): boolean => /\.(pdf|txt|md|markdown|html?|zip)$/iu.test(file.name)
  && !knowledgeFileName(file).split('/').some((part) => part.startsWith('.') || part === '__MACOSX');

/** Read every directory page; directory readers may return only 100 entries per call. */
export async function droppedKnowledgeFiles(data: DataTransfer): Promise<File[]> {
  const result: File[] = [];
  const visit = async (entry: FileSystemEntry, prefix = ''): Promise<void> => {
    const name = `${prefix}${entry.name}`;
    if (entry.name.startsWith('.') || entry.name === '__MACOSX') return;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      if (prefix) Object.defineProperty(file, 'webkitRelativePath', { value: name, configurable: true });
      result.push(file);
      if (result.length > 20000) throw new Error('文件夹条目过多，请选择更具体的资料文件夹。');
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) break;
        for (const child of batch) await visit(child, `${name}/`);
      }
    }
  };
  const entries = Array.from(data.items ?? []).filter((item) => item.kind === 'file').map((item) => item.webkitGetAsEntry?.());
  if (entries.some(Boolean)) { for (const entry of entries) if (entry) await visit(entry); }
  else result.push(...Array.from(data.files));
  return result;
}

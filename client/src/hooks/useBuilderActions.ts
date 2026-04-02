import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface BuilderActionToastPayload {
  title: string;
  description: string;
}

export interface UseBuilderActionsOptions {
  fileName: string;
  mimeType: string;
  /** Toast shown after a successful copy. Defaults to generic copy messages. */
  copySuccess?: BuilderActionToastPayload;
  /** Toast shown after triggering download. Defaults to generic download messages. */
  downloadSuccess?: BuilderActionToastPayload;
}

const DEFAULT_COPY: BuilderActionToastPayload = {
  title: "Copied to Clipboard",
  description: "The content has been copied successfully.",
};

const DEFAULT_DOWNLOAD: BuilderActionToastPayload = {
  title: "Download Started",
  description: "Your file is being downloaded.",
};

export function useBuilderActions({
  fileName,
  mimeType,
  copySuccess = DEFAULT_COPY,
  downloadSuccess = DEFAULT_DOWNLOAD,
}: UseBuilderActionsOptions) {
  const { toast } = useToast();

  const handleCopy = useCallback(
    async (getContent: () => string) => {
      const content = getContent();
      await navigator.clipboard.writeText(content);
      toast(copySuccess);
    },
    [toast, copySuccess]
  );

  const handleDownload = useCallback(
    (getContent: () => string) => {
      const content = getContent();
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(downloadSuccess);
    },
    [fileName, mimeType, toast, downloadSuccess]
  );

  return {
    handleCopy,
    handleDownload,
    copyToast: copySuccess,
    downloadToast: downloadSuccess,
  };
}

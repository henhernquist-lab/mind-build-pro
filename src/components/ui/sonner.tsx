import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      richColors
      closeButton
      duration={4000}
      gap={10}
      visibleToasts={4}
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast bubble-pop-right group-[.toaster]:rounded-2xl group-[.toaster]:border-[hsl(var(--foreground)/0.06)]",
          title: "group-[.toast]:font-display group-[.toast]:tracking-wide",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:btn-shimmer group-[.toast]:text-[hsl(var(--background))] group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-transparent group-[.toast]:border-[hsl(var(--foreground)/0.10)] group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
          success: "group-[.toast]:!border-[hsl(var(--neon)/0.45)]",
          error:   "group-[.toast]:!border-[hsl(var(--pr-red)/0.55)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

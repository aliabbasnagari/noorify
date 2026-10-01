import { useState, type ReactElement } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiFetch } from "@/lib/api/http"
import type { Radio } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

function radioSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("library.components.radioDialog.nameRequired")),
    streamUrl: z
      .string()
      .min(1, t("library.components.radioDialog.streamUrlRequired"))
      .url(t("library.components.radioDialog.urlInvalid")),
    homePageUrl: z.union([
      z.string().url(t("library.components.radioDialog.urlInvalid")),
      z.literal(""),
    ]),
  })
}

/** Handles both create and edit — pass `radio` to edit an existing station. */
export function RadioDialog({
  radio,
  trigger,
}: {
  radio?: Radio
  trigger: ReactElement
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const isEditing = !!radio
  const schema = radioSchema(t)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      name: radio?.name ?? "",
      streamUrl: radio?.streamUrl ?? "",
      homePageUrl: radio?.homePageUrl ?? "",
    },
  })

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      apiFetch<Radio>(isEditing ? `/api/radio/${radio.id}` : "/api/radio", {
        method: isEditing ? "PUT" : "POST",
        body: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radio"] })
      setOpen(false)
      form.reset()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("library.components.radioDialog.editTitle")
              : t("library.components.radioDialog.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("library.components.radioDialog.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="streamUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("library.components.radioDialog.streamUrlLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        "library.components.radioDialog.streamUrlPlaceholder",
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homePageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("library.components.radioDialog.homePageLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        "library.components.radioDialog.homePagePlaceholder",
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {isEditing
                  ? t("library.components.radioDialog.save")
                  : t("library.components.radioDialog.addStation")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

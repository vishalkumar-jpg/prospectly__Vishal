import { CreateEmailOptions } from "resend";
import { EMAILS_MESSAGES } from "./emails.constants";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: CreateEmailOptions["attachments"];
  template?: {
    id: string;
    variables?: Record<string, string | number>;
  };
  /** Email template slug — drives preference gate + unsubscribe category link */
  slug?: string;
  headers?: Record<string, string>;
}

export function buildPayload(
  params: SendEmailParams,
  to: string[],
  defaultFrom: string
): CreateEmailOptions {
  if (!params.html && !params.text && !params.template) {
    throw new Error(EMAILS_MESSAGES.ERROR.EMAIL_CONTENT_MISSING);
  }

  if (params.template) {
    return {
      from: defaultFrom,
      to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      template: {
        id: params.template.id,
        variables: params.template.variables ?? {},
      },
    };
  }

  if (params.html) {
    return {
      from: defaultFrom,
      to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.headers ? { headers: params.headers } : {}),
      ...(params.attachments?.length
        ? { attachments: params.attachments }
        : {}),
    };
  }

  return {
    from: defaultFrom,
    to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    text: params.text as string,
  };
}

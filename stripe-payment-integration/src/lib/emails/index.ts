import { render } from '@react-email/components';
import type { ReactElement } from 'react';
import { Resend} from 'resend';

import { brand } from '../brand';

let resendClient: Resend | null = null;

function getResend(): Resend {
    if(!resendClient) {
        const apiKey = process.env.RESEND_API_KEY;
        if(!apiKey){
            throw new Error("RESEND_API_KEY is not set")
        }
        resendClient = new Resend(apiKey);
    }
    return resendClient;
}

interface SendEmailOptions {
    to: string | string[];
    subject: string;
    template: ReactElement,
    from?: string;
    replyTo?:string;
}

export async function sendEmail({
    to, subject, template, from = process.env.EMAIL_FROM ?? brand.emails.from,
    replyTo,
}: SendEmailOptions) {
    const resend = getResend();
    const html = await render(template);

    return resend.emails.send({
        from,
        to,
        subject,
        html, 
        replyTo
    })
}
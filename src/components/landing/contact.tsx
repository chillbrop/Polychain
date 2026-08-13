"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail, MapPin, MessageSquare, Send } from "lucide-react";
import { post } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { Reveal } from "@/components/shared/reveal";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Add a short subject"),
  message: z.string().min(10, "Message should be at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

export function Contact() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => post("/public/contact", values),
    onSuccess: () => {
      toast({ title: "Message sent", description: "Our team will respond within 24 hours.", variant: "success" });
      reset();
    },
    onError: () => toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" }),
  });

  return (
    <section id="contact" className="relative py-24">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Contact Us</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              We're here <span className="text-gradient-gold">24/7</span>
            </h2>
            <p className="mt-4 max-w-md text-white/50">
              Our support specialists are standing by around the clock. Reach us however is easiest for you.
            </p>

            <div className="mt-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Email support</p>
                  <p className="text-sm text-white/50">support@polychaincapital.example</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Live chat</p>
                  <p className="text-sm text-white/50">Average response time under 5 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Head office</p>
                  <p className="text-sm text-white/50">One Financial District, Victoria Island, Lagos</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              className="glass-card space-y-5 p-8"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">Name</label>
                  <input className="input-dark" placeholder="Your name" {...register("name")} />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">Email</label>
                  <input className="input-dark" placeholder="you@email.com" {...register("email")} />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Subject</label>
                <input className="input-dark" placeholder="How can we help?" {...register("subject")} />
                {errors.subject && <p className="mt-1 text-xs text-red-400">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Message</label>
                <textarea
                  className="input-dark min-h-[140px] resize-none"
                  placeholder="Tell us more..."
                  {...register("message")}
                />
                {errors.message && <p className="mt-1 text-xs text-red-400">{errors.message.message}</p>}
              </div>
              <button type="submit" className="gold-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm">
                <Send className="h-4 w-4" />
                {mutation.isPending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, Award, ArrowRight } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Simple Top Nav */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-3xl">G</span>
            </div>
            <div>
              <span className="font-display font-bold text-3xl tracking-tight text-foreground">Gatherly</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm text-primary mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Now serving youth groups &amp; churches
          </div>

          <h1 className="text-6xl font-display font-bold tracking-tighter text-foreground mb-6">
            Events that bring<br />your community together
          </h1>

          <p className="text-2xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Create, register, and manage events in minutes.<br />
            Built for youth leaders, pastors, and community organizers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="text-lg px-10 h-14 rounded-2xl group">
                Login to Dashboard
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-10 h-14 rounded-2xl">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            Trusted by 200+ youth groups • No credit card required
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <div className="border-t border-b bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
          <div className="font-display font-semibold text-xl">Youth Alive</div>
          <div className="font-display font-semibold text-xl">Hope Chapel</div>
          <div className="font-display font-semibold text-xl">Campus Crusade</div>
          <div className="font-display font-semibold text-xl">City Church KE</div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-semibold tracking-tight">Everything you need in one place</h2>
            <p className="text-muted-foreground mt-3 text-xl">No more spreadsheets. No more WhatsApp chaos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-10 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-2xl mb-3">Create Events Instantly</h3>
                <p className="text-muted-foreground">Beautiful event pages with date, location, price &amp; max attendees in under 60 seconds.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-10 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-accent/10 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-2xl mb-3">Smart Registrations</h3>
                <p className="text-muted-foreground">Youth register with one tap. Leaders see real-time attendance and payment status.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-10 text-center">
                <div className="mx-auto h-16 w-16 rounded-3xl bg-secondary/10 flex items-center justify-center mb-6">
                  <Award className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-display font-semibold text-2xl mb-3">Role-Based Access</h3>
                <p className="text-muted-foreground">Youth see only events. Leaders manage registrations. Admins control everything.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-5xl font-display font-bold tracking-tight mb-6">
            Ready to organize better events?
          </h2>
          <p className="text-2xl opacity-90 mb-10">
            Join hundreds of youth leaders already using Gatherly.
          </p>
          <Link href="/auth/login">
            <Button size="lg" variant="secondary" className="text-lg px-12 h-14 rounded-2xl text-primary font-semibold">
              Login Now – It’s Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Gatherly • Built for communities that gather
      </footer>
    </div>
  );
}
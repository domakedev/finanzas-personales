"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, CheckCircle, Shield, Smartphone, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Trigger entrance animations
    setIsVisible(true);

    // Scroll animation observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
        }
      });
    }, observerOptions);

    // Observe all feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Finanzas Personales Perú",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "PEN"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "127"
            },
            "description": "La mejor aplicación para gestionar tus finanzas personales en Perú. Compatible con Yape, Plin, BCP, Interbank y más."
          })
        }}
      />

      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <header className="relative bg-gradient-to-br from-primary via-secondary to-accent text-white overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-highlight rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
          </div>

          <div className="container relative mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
            {/* Floating badges */}
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
              <div className={`glass-effect px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-700 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
                <Sparkles className="h-4 w-4 text-highlight" />
                <span>100% Gratis</span>
              </div>
              <div className={`glass-effect px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-700 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
                <Lock className="h-4 w-4 text-highlight" />
                <span>Seguro y Privado</span>
              </div>
            </div>

            <h1 className={`text-4xl md:text-6xl font-bold mb-6 transition-all duration-700 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              Deja de preocuparte por el dinero <br className="hidden md:block" />
              <span className="text-highlight">y empieza a hacerlo crecer</span>
            </h1>

            <p className={`text-lg md:text-xl mb-8 max-w-2xl text-blue-100 transition-all duration-700 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              Une todas tus cuentas de BCP, Interbank, Yape, Plin y efectivo en un solo lugar. 
              Visualiza hacia dónde va cada sol y alcanza tus metas de ahorro más rápido.
            </p>

            <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>
              <Link href={user ? "/dashboard" : "/login"}>
                <Button size="lg" className="bg-highlight text-primary hover:bg-highlight/90 hover:scale-105 transition-transform duration-300 animate-pulse-glow w-full sm:w-auto">
                  Ordena tus finanzas hoy <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="bg-transparent border-2 border-white text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 w-full sm:w-auto">
                  Conocer más
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-primary">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              La solución completa para gestionar tus finanzas personales de manera inteligente y segura
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature Card 1 - Dashboard */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-primary/50 transition-all duration-300 group">
                <div className="h-14 w-14 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Smartphone className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
                  Dashboard Inteligente
                </h3>
                <p className="text-muted-foreground text-sm">
                  ¿Te preguntas cuánto tienes realmente? Visualiza todos tus saldos, ingresos y gastos del mes en un solo lugar. Tu resumen financiero completo al instante.
                </p>
              </div>

              {/* Feature Card 2 - Cuentas */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-accent/50 transition-all duration-300 group" style={{ animationDelay: '0.1s' }}>
                <div className="h-14 w-14 bg-gradient-to-br from-accent to-accent/70 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors duration-300">
                  Gestión de Cuentas
                </h3>
                <p className="text-muted-foreground text-sm">
                  ¿Cansado de saltar entre apps? Administra todas tus cuentas bancarias, billeteras digitales (Yape, Plin) y efectivo en un solo lugar.
                </p>
              </div>

              {/* Feature Card 3 - Flujo/Transacciones */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-secondary/50 transition-all duration-300 group" style={{ animationDelay: '0.2s' }}>
                <div className="h-14 w-14 bg-gradient-to-br from-secondary to-secondary/70 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-secondary transition-colors duration-300">
                  Flujo de Transacciones
                </h3>
                <p className="text-muted-foreground text-sm">
                  Descubre en qué gastas realmente tu dinero. Registra cada sol y visualiza patrones que te ayudarán a ahorrar más cada mes.
                </p>
              </div>

              {/* Feature Card 4 - Deudas */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-primary/50 transition-all duration-300 group" style={{ animationDelay: '0.3s' }}>
                <div className="h-14 w-14 bg-gradient-to-br from-red-500 to-red-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-red-500 transition-colors duration-300">
                  Control de Deudas
                </h3>
                <p className="text-muted-foreground text-sm">
                  Deja de perder el sueño por las deudas. Visualiza tu progreso, recibe recordatorios y celebra cada pago que te acerca a estar libre de deudas.
                </p>
              </div>

              {/* Feature Card 5 - Metas */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-green-500/50 transition-all duration-300 group" style={{ animationDelay: '0.4s' }}>
                <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-green-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-green-500 transition-colors duration-300">
                  Metas de Ahorro
                </h3>
                <p className="text-muted-foreground text-sm">
                  Convierte el ahorro en un juego motivador. Ve crecer tu "arbolito" con cada sol que ahorras y alcanza esa meta que tanto deseas.
                </p>
              </div>

              {/* Feature Card 6 - Presupuestos */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-blue-500/50 transition-all duration-300 group" style={{ animationDelay: '0.5s' }}>
                <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors duration-300">
                  Presupuestos Mensuales
                </h3>
                <p className="text-muted-foreground text-sm">
                  Evita los sustos de fin de mes. Define presupuestos inteligentes por categoría y recibe alertas antes de pasarte.
                </p>
              </div>

              {/* Feature Card 7 - Categorías */}
              <div className="feature-card opacity-0 bg-card p-6 rounded-xl shadow-lg border border-border hover:shadow-2xl hover:scale-105 hover:border-purple-500/50 transition-all duration-300 group md:col-span-2 lg:col-span-3" style={{ animationDelay: '0.6s' }}>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-purple-500 transition-colors duration-300">
                      Categorías Personalizadas
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-3xl">
                      Cada persona gasta diferente. Crea categorías personalizadas que se ajusten a tu estilo de vida y obtén reportes que realmente te sirvan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Strip */}
            <div className="mt-16 pt-12 border-t border-border">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">100%</div>
                  <p className="text-sm text-muted-foreground">Gratis y sin publicidad</p>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">Soles y Dólares</div>
                  <p className="text-sm text-muted-foreground">Multi-moneda para Perú</p>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">🔒</div>
                  <p className="text-sm text-muted-foreground">Datos protegidos con Firebase</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 bg-gradient-to-r from-secondary via-primary to-accent text-white text-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-20 w-64 h-64 bg-highlight rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
            <div className="absolute bottom-10 right-20 w-64 h-64 bg-white rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '3s' }}></div>
          </div>

          <div className="container relative mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Únete a los peruanos que están construyendo un mejor futuro financiero
            </h2>
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              Únete a cientos de peruanos que ya están tomando el control de su dinero
            </p>
            <Link href={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="bg-highlight text-primary hover:bg-highlight/90 hover:scale-110 transition-all duration-300 animate-pulse-glow">
                Crear Cuenta Gratis
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card py-8 border-t border-border mt-auto">
          <div className="container mx-auto px-4">
            <div className="text-center text-muted-foreground text-sm">
              <p className="mb-2">© {new Date().getFullYear()} Finanzas Personales Perú. Todos los derechos reservados.</p>
              <p className="text-xs">Hecho con ❤️ para la comunidad peruana</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

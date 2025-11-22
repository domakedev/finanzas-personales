import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, CheckCircle, Shield, Smartphone } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finanzas Personales Perú - Gestiona tu dinero inteligentemente',
  description: 'La mejor app para controlar tus gastos, ahorros y deudas en Perú. Compatible con Yape, Plin y todos los bancos.',
  keywords: 'finanzas personales, peru, ahorro, gastos, deudas, yape, plin, bcp, interbank',
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="bg-primary text-white">
        <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Toma el control de tu dinero <br className="hidden md:block" />
            <span className="text-highlight">al estilo peruano</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl text-blue-100">
            Gestiona tus cuentas de BCP, Interbank, Yape y Plin en un solo lugar. 
            Visualiza tus metas de ahorro y elimina tus deudas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-highlight text-primary hover:bg-highlight/90 w-full sm:w-auto">
                Empezar Gratis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white/10 w-full sm:w-auto">
                Conocer más
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">¿Por qué elegirnos?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Todo en uno</h3>
              <p className="text-muted-foreground">
                Registra tus movimientos de efectivo, bancos y billeteras digitales como Yape y Plin.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Seguro y Privado</h3>
              <p className="text-muted-foreground">
                Tus datos están encriptados. Solo tú tienes acceso a tu información financiera.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Metas Claras</h3>
              <p className="text-muted-foreground">
                Visualiza el crecimiento de tus ahorros con nuestro sistema gamificado de "Arbolito".
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">¿Listo para ordenar tus finanzas?</h2>
          <Link href="/login">
            <Button size="lg" className="bg-highlight text-primary hover:bg-highlight/90">
              Crear Cuenta Gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-8 border-t border-border mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Finanzas Personales Perú. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

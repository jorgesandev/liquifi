"use client";

import Link from "next/link";
import { ArrowRight, Shield, Zap, TrendingUp, FileText, Coins, PiggyBank } from "lucide-react";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  const features = [
    {
      icon: FileText,
      title: "Facturas Tokenizadas",
      description: "Convierte tus facturas CFDI en NFTs verificables en blockchain",
    },
    {
      icon: Coins,
      title: "Préstamos Instantáneos",
      description: "Obtén liquidez inmediata usando tus facturas como colateral",
    },
    {
      icon: TrendingUp,
      title: "Inversiones Rentables",
      description: "Proporciona liquidez y gana retornos competitivos",
    },
    {
      icon: Shield,
      title: "Seguro y Transparente",
      description: "Smart contracts auditados con OpenZeppelin",
    },
    {
      icon: Zap,
      title: "Rápido y Eficiente",
      description: "Proceso automatizado sin intermediarios",
    },
    {
      icon: PiggyBank,
      title: "Vault Tokenizado ERC-4626",
      description: "Estándar de oro en DeFi con rendimientos del 8-15% APY",
    },
  ];

  const stats = [
    { value: "70-85%", label: "LTV Disponible" },
    { value: "8-15%", label: "APY para Inversores" },
    { value: "2-4h", label: "Evaluación KYB" },
    { value: "Minutos", label: "Liquidez Instantánea" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              La Nueva Forma de
              <span className="block text-purple-600">
                Acceso a Capital
              </span>
              <span className="block text-gray-900 text-3xl md:text-4xl mt-4 font-normal">
                que llegó para quedarse
              </span>
          </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Tecnología Web3 para redefinir el factoraje. Convierte tus facturas en NFTs,
              obtén liquidez instantánea en minutos o invierte con rendimientos del 8-15% APY.
              Todo transparente, automatizado y 30-50% más barato que el factoraje tradicional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/borrow"
                className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-lg shadow-lg shadow-purple-500/30"
              >
                Pedir Préstamo
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/invest"
                className="inline-flex items-center gap-2 px-8 py-4 bg-purple-400 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors text-lg shadow-lg shadow-purple-400/30"
              >
                Invertir
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 bg-white rounded-lg shadow-sm border border-purple-100"
              >
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Características Principales
            </h2>
            <p className="text-xl text-gray-600">
              Factoring descentralizado con identidad Web3 verificable
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works - Borrowers */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Cómo Funciona para Prestatarios?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nuestro sistema de IA evalúa 7 dimensiones de calidad crediticia en 2-4 horas.
              Cada factura recibe un grado de riesgo (A, B, C o D) y acceso a capital a un costo
              30-50% más bajo que el factoraje tradicional.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Sube tu Factura", desc: "Sube tu CFDI en formato XML o PDF" },
              { step: "2", title: "Verificación KYB", desc: "IA evalúa 7 dimensiones en 2-4 horas. Recibe tu subdominio ENS" },
              { step: "3", title: "Tokenización", desc: "Tu factura se convierte en NFT verificable en blockchain" },
              { step: "4", title: "Liquidez Inmediata", desc: "Recibe 70-85% LTV en USDC en minutos, no semanas" },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-purple-500/30">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/borrow"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30"
            >
              Comenzar a Pedir Préstamo
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works - Investors */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Cómo Funciona para Inversores?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Deposita USDC en nuestro vault tokenizado ERC-4626 y obtén rendimientos del 8-15% APY
              respaldados por activos reales. Cuando las facturas se cobran, recibes tus ganancias
              distribuidas automáticamente. Todo transparente, todo auditable, todo onchain.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Deposita USDC", desc: "Deposita stablecoins en el vault ERC-4626" },
              { step: "2", title: "Financia Préstamos", desc: "Tu capital financia préstamos a PyMEs mexicanas" },
              { step: "3", title: "Gana Rendimientos", desc: "Recibe 8-15% APY automáticamente distribuido" },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-purple-400 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-purple-400/30">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/invest"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-400 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors shadow-lg shadow-purple-400/30"
            >
              Comenzar a Invertir
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            ¿Listo para Comenzar?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Activa el capital congelado de tus facturas. Transparente, automatizado y onchain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/borrow"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
            >
              Pedir Préstamo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/invest"
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-400 text-white rounded-lg font-semibold hover:bg-purple-500 transition-colors shadow-lg"
          >
              Invertir
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

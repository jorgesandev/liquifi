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
      title: "Vault Tokenizado",
      description: "Sistema descentralizado de préstamos y depósitos",
    },
  ];

  const stats = [
    { value: "70%", label: "LTV Máximo" },
    { value: "10%", label: "Tasa Anual" },
    { value: "<24h", label: "Tiempo de Procesamiento" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Financiamiento de Facturas
              <span className="block text-purple-600">
                Descentralizado
              </span>
          </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Convierte tus facturas en NFTs, obtén liquidez instantánea o invierte
              en un vault tokenizado. Todo en Arbitrum Sepolia.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              Todo lo que necesitas para financiamiento descentralizado
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Conecta Wallet", desc: "Conecta tu MetaMask en Arbitrum Sepolia" },
              { step: "2", title: "Sube CFDI", desc: "Sube tu factura en formato XML o PDF" },
              { step: "3", title: "Mint NFT", desc: "Tokeniza tu factura como NFT verificable" },
              { step: "4", title: "Obtén Liquidez", desc: "Deposita NFT y recibe hasta 70% LTV" },
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Conecta Wallet", desc: "Conecta tu MetaMask con fondos" },
              { step: "2", title: "Deposita", desc: "Deposita ETH o tokens en el vault" },
              { step: "3", title: "Gana Intereses", desc: "Recibe retornos de los préstamos" },
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
            Únete a la revolución del financiamiento descentralizado
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

"use client";

import Image from "next/image";

export default function Contact() {
  return (
    <section className="relative w-full py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white bg-opacity-90 rounded-md shadow-lg p-8">
        <h1 className="text-3xl font-bold text-black mb-6">Contactez-nous</h1>
        <form>
          <div className="mb-4">
            <label
              className="block text-black text-sm font-bold mb-2"
              htmlFor="name"
            >
              Nom
            </label>
            <input
              className="w-full px-3 py-2 text-black leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
              id="name"
              type="text"
              placeholder="Votre nom"
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-black text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="w-full px-3 py-2 text-black leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="Votre email"
            />
          </div>
          <div className="mb-6">
            <label
              className="block text-black text-sm font-bold mb-2"
              htmlFor="message"
            >
              Message
            </label>
            <textarea
              className="w-full px-3 py-2 text-black leading-tight border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
              id="message"
              placeholder="Votre message"
              rows="5"
            ></textarea>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-[#ffc107] hover:text-black transition-colors duration-300"
              type="button"
            >
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SimpleUnifiedWidget } from "@/components/booking/SimpleUnifiedWidget"
import { Star, Fish, Shield, Camera, Coffee, Users, Phone, MessageCircle, Clock, MapPin } from "lucide-react"

export default function FishingLandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    preferredDate: "",
  })

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle contact form submission
    console.log("Contact form submitted:", formData)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/hero-fishing-boat-cascais.png')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="font-sans font-black text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
            Premium Deep Sea Fishing Experience in Cascais
          </h1>
          <p className="font-serif text-xl md:text-2xl mb-8 opacity-90">
            Professional guide • Premium equipment • 4-hour adventure
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 text-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="font-semibold">Private Charter:</span> €400 (1-6 people)
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="font-semibold">Join Group:</span> €95/person
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8 py-4 text-lg"
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
            >
              Book Your Fishing Trip
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-foreground px-8 py-4 bg-transparent"
              onClick={() => window.open("https://wa.me/351934027852", "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp Booking
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="opacity-90">4.9/5 • 200+ Happy Customers</span>
          </div>
        </div>
      </section>

      {/* Simple Unified Widget */}
      <SimpleUnifiedWidget />

      {/* What's Included Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-sans font-bold text-3xl md:text-4xl text-center mb-12 text-primary">
            What's Included in Your Adventure
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="relative h-64 rounded-lg overflow-hidden">
              <img
                src="/happy-tourist-fish.png"
                alt="Happy customers with Atlantic tuna catch"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-sans font-semibold text-lg">Amazing Catches</h3>
                <p className="text-sm opacity-90">Atlantic tuna & more</p>
              </div>
            </div>

            <div className="relative h-64 rounded-lg overflow-hidden">
              <img
                src="/deep-sea-fishing-action.png"
                alt="Deep sea fishing action"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-sans font-semibold text-lg">Atlantic Adventure</h3>
                <p className="text-sm opacity-90">Deep sea fishing experience</p>
              </div>
            </div>

            <div className="relative h-64 rounded-lg overflow-hidden">
              <img
                src="/atlantic-fish-catch.png"
                alt="Fresh Atlantic fish catch"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-sans font-semibold text-lg">Fresh Catch</h3>
                <p className="text-sm opacity-90">Enjoy your fresh Atlantic fish catch</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8 text-primary" />,
                title: "Professional Fishing Guide",
                description: "Experienced local captain with 15+ years expertise",
              },
              {
                icon: <Fish className="w-8 h-8 text-primary" />,
                title: "Premium Equipment & Bait",
                description: "Top-quality rods, reels, and fresh bait provided",
              },
              {
                icon: <Shield className="w-8 h-8 text-primary" />,
                title: "Safety Equipment",
                description: "Life jackets, first aid, and safety briefing included",
              },
              {
                icon: <Coffee className="w-8 h-8 text-primary" />,
                title: "Refreshments on Board",
                description: "Complimentary drinks and light snacks during trip",
              },
              {
                icon: <Fish className="w-8 h-8 text-primary" />,
                title: "Fish Cleaning Service",
                description: "We'll clean and prepare your catch for you",
              },
              {
                icon: <Camera className="w-8 h-8 text-primary" />,
                title: "Photo & Video Memories",
                description: "Professional photos of your fishing experience",
              },
            ].map((item, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">{item.icon}</div>
                  <h3 className="font-sans font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="font-serif text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>



      {/* Social Proof Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-sans font-bold text-3xl md:text-4xl text-center mb-12 text-primary">
            What Our Customers Say
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "James Wilson",
                country: "🇺🇸 USA",
                rating: 5,
                text: "Incredible experience! Caught a 15kg tuna and the crew was fantastic. Worth every euro!",
                image: "/happy-tourist-fisherman.png",
              },
              {
                name: "Marie Dubois",
                country: "🇫🇷 France",
                rating: 5,
                text: "Professional service and amazing Atlantic waters. The photos they took were perfect memories.",
                image: "/happy-tourist-woman-fishing-boat.png",
              },
              {
                name: "Hans Mueller",
                country: "🇩🇪 Germany",
                rating: 5,
                text: "Best fishing trip of my life! Great equipment, knowledgeable guide, and beautiful Cascais coastline.",
                image: "/happy-tourist-fish.png",
              },
            ].map((review, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <img
                      src={review.image || "/placeholder.svg"}
                      alt={review.name}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                    <div>
                      <h4 className="font-sans font-semibold">{review.name}</h4>
                      <p className="text-sm text-muted-foreground">{review.country}</p>
                    </div>
                  </div>

                  <div className="flex mb-3">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  <p className="font-serif text-muted-foreground italic">"{review.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-4 bg-primary/10 rounded-lg px-6 py-4">
              <div className="text-center">
                <div className="font-sans font-bold text-2xl text-primary">200+</div>
                <div className="text-sm text-muted-foreground">Happy Customers</div>
              </div>
              <div className="w-px h-12 bg-border"></div>
              <div className="text-center">
                <div className="font-sans font-bold text-2xl text-primary">4.9/5</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="w-px h-12 bg-border"></div>
              <div className="text-center">
                <div className="font-sans font-bold text-2xl text-primary">15+</div>
                <div className="text-sm text-muted-foreground">Years Experience</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact/Book Section */}
      <section id="booking" className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-sans font-bold text-3xl md:text-4xl text-center mb-12 text-primary">
            Ready for Your Atlantic Adventure?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="relative h-48 rounded-lg overflow-hidden">
              <img
                src="/captain-joao-casual.png"
                alt="Captain João in casual attire with TaylorMade baseball cap"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-sans font-semibold text-lg">Captain João</h3>
                <p className="text-sm opacity-90">15+ years experience</p>
              </div>
            </div>

            <div className="relative h-48 rounded-lg overflow-hidden">
              <img
                src="/cascais-marina-sunset.png"
                alt="Beautiful Cascais Marina with lighthouse and Portuguese architecture"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="font-sans font-semibold text-lg">Cascais Marina</h3>
                <p className="text-sm opacity-90">Departure point</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card>
              <CardContent className="p-8">
                <h3 className="font-sans font-semibold text-xl mb-6">Book Your Trip</h3>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone / WhatsApp</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+380 97 101 8913, +351 934 027 852"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferred-date">Preferred Date</Label>
                    <Input
                      id="preferred-date"
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                    size="lg"
                  >
                    Submit Booking Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-sans font-semibold text-lg mb-4">Quick Contact</h3>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={() => window.open("https://wa.me/351934027852", "_blank")}
                    >
                      <MessageCircle className="w-5 h-5 mr-3 text-green-600" />
                      WhatsApp: +351 934 027 852
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
              onClick={() => window.open("tel:+351934027852", "_blank")}
                    >
                      <Phone className="w-5 h-5 mr-3 text-primary" />
                      Call: +351 934 027 852
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-sans font-semibold text-lg mb-4">Trip Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span>Duration: 3-4 hours</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span>Departure: Cascais Marina</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span>Group size: 1-6 people</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="font-sans font-bold text-xl mb-4">Cascais Premium Fishing</h3>
          <p className="font-serif mb-4">Experience the Atlantic like never before</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Licensed & Insured</span>
            </div>
            <span className="hidden sm:block">•</span>
            <div className="flex items-center gap-2">
              <Fish className="w-5 h-5" />
              <span>Professional Equipment</span>
            </div>
            <span className="hidden sm:block">•</span>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span>15+ Years Experience</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

"use client";

import { useState, type FormEvent } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSubmitted(true);
  }
  return <form className="card form-card" onSubmit={handleSubmit}>
    <h2 style={{ margin: "0 0 22px", fontSize: 19 }}>Send us a note</h2>
    <div className="form-grid">
      <div className="form-group"><label htmlFor="name">Name</label><input className="form-field" id="name" name="name" autoComplete="name" required maxLength={100} /></div>
      <div className="form-group"><label htmlFor="email">Email</label><input className="form-field" id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
      <div className="form-group full"><label htmlFor="subject">Subject</label><input className="form-field" id="subject" name="subject" required maxLength={150} /></div>
      <div className="form-group full"><label htmlFor="message">Message</label><textarea className="form-field" id="message" name="message" required minLength={10} maxLength={3000} /></div>
      <div className="form-group full"><button className="button button-primary" type="submit">Submit message</button></div>
      {submitted && <div className="form-group full"><p className="form-feedback" role="status">Thanks for preparing your message. Delivery is not available yet because a backend has not been integrated. Your details have not been sent or saved.</p></div>}
    </div>
  </form>;
}

import React from 'react'
import { AlertTriangle, Clock, Ban } from 'lucide-react'
import { Button } from './ui/Button'

export function NotFoundPage({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Espace introuvable</h1>
        <p className="text-muted-foreground mb-2">
          L'espace <strong className="text-foreground">{slug}</strong> n'existe pas ou a été supprimé.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Vérifiez l'URL ou contactez votre administrateur.
        </p>
        <a href="/">
          <Button variant="outline">Retour à l'accueil</Button>
        </a>
      </div>
    </div>
  )
}

export function SuspendedAccessPage({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Accès suspendu</h1>
        <p className="text-muted-foreground mb-2">
          L'accès à <strong className="text-foreground">{slug}</strong> est temporairement suspendu.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Contactez votre administrateur pour plus d'informations.
        </p>
        <a href="/">
          <Button variant="outline">Retour à l'accueil</Button>
        </a>
      </div>
    </div>
  )
}

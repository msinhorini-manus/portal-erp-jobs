import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, CheckCircle, Clock, Mail, ArrowRight } from 'lucide-react';

export default function RegisterCompanySuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-[#F26522]" />
            <span className="text-2xl font-bold">
              <span className="text-[#003570]">Portal ERP</span>
              <span className="text-[#F26522]"> Jobs</span>
            </span>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-center text-green-600">
              Cadastro Realizado!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-center text-gray-600">
              Sua empresa foi cadastrada com sucesso no Portal ERP Jobs.
            </p>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próximos passos
              </h3>
              <ol className="space-y-3 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                  <span>Nossa equipe irá analisar o cadastro da sua empresa</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                  <span>Você receberá um email quando sua conta for aprovada</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                  <span>Após a aprovação, você poderá publicar vagas e acessar candidatos</span>
                </li>
              </ol>
            </div>

            {/* Email Notice */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">Verifique seu email</p>
                <p>Enviamos um email de confirmação para o endereço cadastrado. Por favor, verifique também sua pasta de spam.</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="text-center text-sm text-gray-500">
              <p>O processo de aprovação geralmente leva até <strong>24 horas úteis</strong>.</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-0">
            <Link to="/" className="w-full">
              <Button className="w-full bg-[#F26522] hover:bg-[#d55a1d]">
                Voltar para a página inicial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link
              to="/login?type=company"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Já foi aprovado? Faça login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

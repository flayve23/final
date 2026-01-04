// src/pages/streamer/ScheduleManager.tsx
// Gerenciador de Horários e Disponibilidade

import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, AlertCircle } from 'lucide-react';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState<any>({});
  const [absences, setAbsences] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [newAbsence, setNewAbsence] = useState({ start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    loadSchedule();
    loadAbsences();
  }, []);

  const loadSchedule = async () => {
    const res = await fetch('/api/schedules/streamer/me');
    const data = await res.json();
    setSchedule(data.schedule || {});
  };

  const loadAbsences = async () => {
    const res = await fetch('/api/schedules/streamer/me/absences');
    const data = await res.json();
    setAbsences(data.absences || []);
  };

  const saveTimeSlot = async (day: number, start: string, end: string) => {
    await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: day, start_time: start, end_time: end })
    });
    loadSchedule();
    setEditing(null);
  };

  const deleteTimeSlot = async (scheduleId: string) => {
    await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
    loadSchedule();
  };

  const addAbsence = async () => {
    await fetch('/api/schedules/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAbsence)
    });
    loadAbsences();
    setNewAbsence({ start_date: '', end_date: '', reason: '' });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Calendar className="w-8 h-8" />
        Gerenciar Disponibilidade
      </h1>

      {/* Horário Semanal */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Horário da Semana</h2>
        <div className="space-y-4">
          {DAYS.map((day, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">{day}</h3>
              <div className="space-y-2">
                {(schedule[index] || []).map((slot: any) => (
                  <div key={slot.id} className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{slot.start_time} - {slot.end_time}</span>
                    <button onClick={() => deleteTimeSlot(slot.id)} className="ml-auto text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setEditing(index)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Adicionar horário
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Edição */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Adicionar horário - {DAYS[editing]}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Horário de Início</label>
                <input type="time" id="start-time" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horário de Fim</label>
                <input type="time" id="end-time" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="flex-1 border border-gray-300 rounded-lg px-4 py-2">Cancelar</button>
                <button onClick={() => {
                  const start = (document.getElementById('start-time') as HTMLInputElement).value;
                  const end = (document.getElementById('end-time') as HTMLInputElement).value;
                  saveTimeSlot(editing, start, end);
                }} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ausências Programadas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Ausências Programadas
        </h2>
        <div className="space-y-3 mb-4">
          {absences.map((abs: any) => (
            <div key={abs.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-semibold">{abs.start_date} até {abs.end_date}</p>
              {abs.reason && <p className="text-sm text-gray-600">{abs.reason}</p>}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Nova Ausência</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data Início</label>
              <input type="date" value={newAbsence.start_date} onChange={(e) => setNewAbsence({...newAbsence, start_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fim</label>
              <input type="date" value={newAbsence.end_date} onChange={(e) => setNewAbsence({...newAbsence, end_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
            <input type="text" value={newAbsence.reason} onChange={(e) => setNewAbsence({...newAbsence, reason: e.target.value})} placeholder="Férias, viagem, etc..." className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <button onClick={addAbsence} disabled={!newAbsence.start_date || !newAbsence.end_date} className="w-full bg-yellow-500 text-white rounded-lg px-4 py-2 hover:bg-yellow-600 disabled:opacity-50">Adicionar Ausência</button>
        </div>
      </div>
    </div>
  );
}

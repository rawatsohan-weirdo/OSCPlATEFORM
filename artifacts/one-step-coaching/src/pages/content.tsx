import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Subject, Chapter, Topic, ContentItem } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  ChevronRight,
  Plus,
  ArrowLeft,
  FileText,
  Video,
  Type,
  Trash2,
  ExternalLink,
} from "lucide-react";

type View = "subjects" | "chapters" | "topics" | "content";

export default function ContentPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const canCreate = profile?.role === "Teacher" || profile?.role === "Admin";

  const [view, setView] = useState<View>("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [contentType, setContentType] = useState<"pdf" | "video" | "text">("text");
  const [contentText, setContentText] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("subjects").select("*").order("created_at", { ascending: false });
    setSubjects(data || []);
    setLoading(false);
  }, []);

  const fetchChapters = useCallback(async (subjectId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("subject_id", subjectId)
      .order("order_index");
    setChapters(data || []);
    setLoading(false);
  }, []);

  const fetchTopics = useCallback(async (chapterId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("topics")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("order_index");
    setTopics(data || []);
    setLoading(false);
  }, []);

  const fetchContent = useCallback(async (topicId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("content_items")
      .select("*")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false });
    setContentItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreateSubject = async () => {
    if (!formName.trim()) return;
    const { error } = await supabase.from("subjects").insert({
      name: formName.trim(),
      description: formDesc.trim() || null,
      created_by: profile?.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Subject created" });
      setDialogOpen(false);
      setFormName("");
      setFormDesc("");
      fetchSubjects();
    }
  };

  const handleCreateChapter = async () => {
    if (!formName.trim() || !selectedSubject) return;
    const { error } = await supabase.from("chapters").insert({
      subject_id: selectedSubject.id,
      title: formName.trim(),
      description: formDesc.trim() || null,
      order_index: chapters.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Chapter created" });
      setDialogOpen(false);
      setFormName("");
      setFormDesc("");
      fetchChapters(selectedSubject.id);
    }
  };

  const handleCreateTopic = async () => {
    if (!formName.trim() || !selectedChapter) return;
    const { error } = await supabase.from("topics").insert({
      chapter_id: selectedChapter.id,
      title: formName.trim(),
      description: formDesc.trim() || null,
      order_index: topics.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Topic created" });
      setDialogOpen(false);
      setFormName("");
      setFormDesc("");
      fetchTopics(selectedChapter.id);
    }
  };

  const handleCreateContent = async () => {
    if (!formName.trim() || !selectedTopic) return;

    let fileUrl: string | null = null;

    if (contentType === "pdf" && pdfFile) {
      const filePath = `content/${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("coaching-assets")
        .upload(filePath, pdfFile);
      if (uploadError) {
        toast({ title: "Upload Error", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("coaching-assets").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("content_items").insert({
      topic_id: selectedTopic.id,
      type: contentType,
      title: formName.trim(),
      content_text: contentType === "text" ? contentText : null,
      video_url: contentType === "video" ? videoUrl : null,
      file_url: contentType === "pdf" ? fileUrl : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Content created" });
      setDialogOpen(false);
      setFormName("");
      setFormDesc("");
      setContentText("");
      setVideoUrl("");
      setPdfFile(null);
      fetchContent(selectedTopic.id);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted successfully" });
      if (view === "subjects") fetchSubjects();
      else if (view === "chapters" && selectedSubject) fetchChapters(selectedSubject.id);
      else if (view === "topics" && selectedChapter) fetchTopics(selectedChapter.id);
      else if (view === "content" && selectedTopic) fetchContent(selectedTopic.id);
    }
  };

  const goBack = () => {
    if (view === "content") {
      setView("topics");
      if (selectedChapter) fetchTopics(selectedChapter.id);
    } else if (view === "topics") {
      setView("chapters");
      if (selectedSubject) fetchChapters(selectedSubject.id);
    } else if (view === "chapters") {
      setView("subjects");
      fetchSubjects();
    }
  };

  const breadcrumb = () => {
    const parts = ["Subjects"];
    if (selectedSubject && view !== "subjects") parts.push(selectedSubject.name);
    if (selectedChapter && (view === "topics" || view === "content")) parts.push(selectedChapter.title);
    if (selectedTopic && view === "content") parts.push(selectedTopic.title);
    return parts;
  };

  if (loading && view === "subjects" && subjects.length === 0) {
    return (
      <div className="space-y-4" data-testid="content-loading">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const renderCreateDialog = () => {
    const isContent = view === "content";
    const titles: Record<View, string> = {
      subjects: "Create Subject",
      chapters: "Create Chapter",
      topics: "Create Topic",
      content: "Add Content",
    };

    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1" data-testid="button-create">
            <Plus className="w-4 h-4" /> {titles[view]}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titles[view]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter title"
                data-testid="input-create-title"
              />
            </div>
            {!isContent && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional description"
                  data-testid="input-create-desc"
                />
              </div>
            )}
            {isContent && (
              <>
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as "pdf" | "video" | "text")}>
                    <SelectTrigger data-testid="select-content-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Note</SelectItem>
                      <SelectItem value="video">Video URL</SelectItem>
                      <SelectItem value="pdf">PDF Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {contentType === "text" && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={contentText}
                      onChange={(e) => setContentText(e.target.value)}
                      placeholder="Enter your notes..."
                      rows={6}
                      data-testid="input-content-text"
                    />
                  </div>
                )}
                {contentType === "video" && (
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      data-testid="input-video-url"
                    />
                  </div>
                )}
                {contentType === "pdf" && (
                  <div className="space-y-2">
                    <Label>PDF File (max 5MB)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast({ title: "Error", description: "File too large (max 5MB)", variant: "destructive" });
                          return;
                        }
                        setPdfFile(file || null);
                      }}
                      data-testid="input-pdf-file"
                    />
                  </div>
                )}
              </>
            )}
            <Button
              className="w-full"
              onClick={() => {
                if (view === "subjects") handleCreateSubject();
                else if (view === "chapters") handleCreateChapter();
                else if (view === "topics") handleCreateTopic();
                else handleCreateContent();
              }}
              data-testid="button-submit-create"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-4" data-testid="content-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view !== "subjects" && (
            <Button variant="ghost" size="sm" onClick={goBack} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb().map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={i === breadcrumb().length - 1 ? "text-foreground font-medium" : ""}>{part}</span>
              </span>
            ))}
          </div>
        </div>
        {canCreate && renderCreateDialog()}
      </div>

      {view === "subjects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedSubject(subject);
                setView("chapters");
                fetchChapters(subject.id);
              }}
              data-testid={`card-subject-${subject.id}`}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    {subject.description && (
                      <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
                    )}
                  </div>
                </div>
                {canCreate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete("subjects", subject.id);
                    }}
                    data-testid={`button-delete-subject-${subject.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </CardHeader>
            </Card>
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground" data-testid="text-no-subjects">
              No subjects yet. {canCreate ? "Create one to get started." : ""}
            </div>
          )}
        </div>
      )}

      {view === "chapters" && (
        <div className="space-y-3">
          {chapters.map((chapter) => (
            <Card
              key={chapter.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedChapter(chapter);
                setView("topics");
                fetchTopics(chapter.id);
              }}
              data-testid={`card-chapter-${chapter.id}`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium">{chapter.title}</h3>
                  {chapter.description && <p className="text-sm text-muted-foreground">{chapter.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete("chapters", chapter.id);
                      }}
                      data-testid={`button-delete-chapter-${chapter.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {chapters.length === 0 && (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-chapters">
              No chapters yet.
            </div>
          )}
        </div>
      )}

      {view === "topics" && (
        <div className="space-y-3">
          {topics.map((topic) => (
            <Card
              key={topic.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedTopic(topic);
                setView("content");
                fetchContent(topic.id);
              }}
              data-testid={`card-topic-${topic.id}`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium">{topic.title}</h3>
                  {topic.description && <p className="text-sm text-muted-foreground">{topic.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete("topics", topic.id);
                      }}
                      data-testid={`button-delete-topic-${topic.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {topics.length === 0 && (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-topics">
              No topics yet.
            </div>
          )}
        </div>
      )}

      {view === "content" && (
        <div className="space-y-3">
          {contentItems.map((item) => (
            <Card key={item.id} data-testid={`card-content-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mt-1">
                      {item.type === "pdf" && <FileText className="w-5 h-5 text-red-500" />}
                      {item.type === "video" && <Video className="w-5 h-5 text-blue-500" />}
                      {item.type === "text" && <Type className="w-5 h-5 text-green-500" />}
                    </div>
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      <span className="text-xs text-muted-foreground uppercase">{item.type}</span>
                      {item.type === "text" && item.content_text && (
                        <p className="mt-2 text-sm whitespace-pre-wrap">{item.content_text}</p>
                      )}
                      {item.type === "video" && item.video_url && (
                        <a
                          href={item.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
                          data-testid={`link-video-${item.id}`}
                        >
                          <ExternalLink className="w-3 h-3" /> Watch Video
                        </a>
                      )}
                      {item.type === "pdf" && item.file_url && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
                          data-testid={`link-pdf-${item.id}`}
                        >
                          <ExternalLink className="w-3 h-3" /> View PDF
                        </a>
                      )}
                    </div>
                  </div>
                  {canCreate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete("content_items", item.id)}
                      data-testid={`button-delete-content-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {contentItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-content">
              No content yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
